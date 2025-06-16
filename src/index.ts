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

function parsePeriod(period: string): Date {
  const now = new Date();
  const match = period.match(/^(\d+)([dwmy])$/);
  
  if (!match) {
    throw new Error('Invalid period format. Use format like 1d, 1w, 1m, 2m, 6m, 1y');
  }
  
  const [, amount, unit] = match;
  const num = parseInt(amount, 10);
  
  switch (unit) {
    case 'd': // days
      return new Date(now.getTime() - num * 24 * 60 * 60 * 1000);
    case 'w': // weeks
      return new Date(now.getTime() - num * 7 * 24 * 60 * 60 * 1000);
    case 'm': // months
      const monthsAgo = new Date(now);
      monthsAgo.setMonth(monthsAgo.getMonth() - num);
      return monthsAgo;
    case 'y': // years
      const yearsAgo = new Date(now);
      yearsAgo.setFullYear(yearsAgo.getFullYear() - num);
      return yearsAgo;
    default:
      throw new Error('Invalid period unit. Use d (days), w (weeks), m (months), or y (years)');
  }
}

async function fetchStockData(symbol: string, period: string = '1d', outputFormat: 'table' | 'jsonl' = 'table'): Promise<void> {
  try {
    // 東証銘柄の場合、.T を追加
    const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.T`;
    
    if (outputFormat === 'table') {
      console.log(`Fetching 1-minute data for ${yahooSymbol} (${period})...`);
    }
    
    const endDate = new Date();
    const startDate = parsePeriod(period);
    
    const result = await yahooFinance.chart(yahooSymbol, {
      period1: startDate,
      period2: endDate,
      interval: '1m'
    });
    
    if (!result.quotes || result.quotes.length === 0) {
      if (outputFormat === 'table') {
        console.log(`No data found for ${period}. Market might be closed or symbol invalid.`);
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
      console.log(`\n=== ${yahooSymbol} - ${period} 1-minute data (trading hours only) ===`);
      console.log('Date\t\tTime\t\tOpen\tHigh\tLow\tClose\tVolume');
      console.log('─'.repeat(80));
      
      filteredQuotes.forEach((data) => {
        const date = data.date.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'Asia/Tokyo'
        });
        const time = data.date.toLocaleTimeString('ja-JP', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Tokyo'
        });
        
        console.log(
          `${date}\t${time}\t${data.open!.toFixed(2)}\t${data.high!.toFixed(2)}\t` +
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
  .option('-p, --period <period>', 'Period to fetch data (e.g., 1d, 1w, 1m, 2m, 6m, 1y)', '1d')
  .option('-j, --jsonl', 'Output in JSONL format instead of table format')
  .action((symbol: string, options: { period?: string; jsonl?: boolean }) => {
    const period = options.period || '1d';
    const outputFormat = options.jsonl ? 'jsonl' : 'table';
    fetchStockData(symbol, period, outputFormat);
  });

program.parse(process.argv);