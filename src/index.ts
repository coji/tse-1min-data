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

async function fetchStockData(symbol: string): Promise<void> {
  try {
    // 東証銘柄の場合、.T を追加
    const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.T`;
    
    console.log(`Fetching 1-minute data for ${yahooSymbol}...`);
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const result = await yahooFinance.chart(yahooSymbol, {
      period1: startOfDay,
      period2: endOfDay,
      interval: '1m'
    });
    
    if (!result.quotes || result.quotes.length === 0) {
      console.log('No data found for today. Market might be closed or symbol invalid.');
      return;
    }
    
    // 休み時間のデータをフィルタ（価格データがnullの場合を除外）
    const filteredQuotes = result.quotes.filter(data => 
      data.open !== null && data.high !== null && data.low !== null && data.close !== null
    );
    
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
  .action((symbol: string) => {
    fetchStockData(symbol);
  });

program.parse(process.argv);