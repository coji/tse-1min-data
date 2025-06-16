#!/usr/bin/env node

import { Command } from 'commander';
import yahooFinance from 'yahoo-finance2';

const program = new Command();

interface StockData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchStockData(symbol: string, outputFormat: 'table' | 'jsonl' = 'table'): Promise<void> {
  try {
    // 東証銘柄の場合、.T を追加
    const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.T`;
    
    if (outputFormat === 'table') {
      console.log(`Fetching 1-minute data for ${yahooSymbol}...`);
    }
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const result = await yahooFinance.chart(yahooSymbol, {
      period1: startOfDay,
      period2: endOfDay,
      interval: '1m'
    });
    
    if (!result.quotes || result.quotes.length === 0) {
      if (outputFormat === 'table') {
        console.log('No data found for today. Market might be closed or symbol invalid.');
      }
      return;
    }
    
    // 休み時間のデータをフィルタ（価格データがnullの場合を除外）
    const filteredQuotes = result.quotes.filter(data => 
      data.open !== null && data.high !== null && data.low !== null && data.close !== null
    );
    
    if (outputFormat === 'jsonl') {
      // JSONL形式で出力
      filteredQuotes.forEach((data) => {
        const record = {
          symbol: yahooSymbol,
          timestamp: data.date.toISOString(),
          date: data.date.toISOString().split('T')[0],
          time: data.date.toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Tokyo'
          }),
          open: Number(data.open!.toFixed(2)),
          high: Number(data.high!.toFixed(2)),
          low: Number(data.low!.toFixed(2)),
          close: Number(data.close!.toFixed(2)),
          volume: data.volume || 0
        };
        console.log(JSON.stringify(record));
      });
    } else {
      // テーブル形式で出力
      console.log(`\n=== ${yahooSymbol} - Today's 1-minute data (trading hours only) ===`);
      console.log('Time\t\tOpen\tHigh\tLow\tClose\tVolume');
      console.log('─'.repeat(60));
      
      filteredQuotes.forEach((data) => {
        const time = data.date.toLocaleTimeString('ja-JP', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Tokyo'
        });
        
        console.log(
          `${time}\t${data.open!.toFixed(2)}\t${data.high!.toFixed(2)}\t` +
          `${data.low!.toFixed(2)}\t${data.close!.toFixed(2)}\t${data.volume || 0}`
        );
      });
      
      console.log(`\nTotal ${filteredQuotes.length} records found (${result.quotes.length - filteredQuotes.length} break-time records filtered out).`);
    }
    
  } catch (error) {
    console.error('Error fetching stock data:', error);
    process.exit(1);
  }
}

program
  .name('stock-data')
  .description('Fetch 1-minute interval stock data for TSE stocks')
  .version('1.0.0')
  .argument('<symbol>', 'Stock symbol (e.g., 7203 for Toyota, 9984 for SoftBank)')
  .option('-j, --jsonl', 'Output in JSONL format instead of table format')
  .action((symbol: string, options: { jsonl?: boolean }) => {
    const outputFormat = options.jsonl ? 'jsonl' : 'table';
    fetchStockData(symbol, outputFormat);
  });

program.parse(process.argv);