#!/usr/bin/env node

/**
 * Historical Data Fetcher for Flash Crash Backtesting
 * 
 * Fetches real historical market data from multiple sources for backtesting
 * the flash crash prediction algorithm against actual market events.
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

class HistoricalDataFetcher {
  constructor() {
    this.dataDir = './backtest-data';
    this.ensureDataDirectory();
  }

  /**
   * Ensures data directory exists
   */
  async ensureDataDirectory() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  /**
   * Fetches historical kline/candlestick data from multiple sources
   */
  async fetchHistoricalData(symbol, startDate, endDate, interval = '1m') {
    console.log(`📊 Fetching historical data for ${symbol}`);
    console.log(`📅 Period: ${startDate} to ${endDate}`);
    console.log(`⏱️ Interval: ${interval}\n`);

    const sources = [
      () => this.fetchFromCoinGecko(symbol, startDate, endDate),
      () => this.fetchFromAlphaVantage(symbol, startDate, endDate),
      () => this.fetchFromYahooFinance(symbol, startDate, endDate),
      () => this.fetchFromCryptoCompare(symbol, startDate, endDate)
    ];

    for (const fetchMethod of sources) {
      try {
        const data = await fetchMethod();
        if (data && data.length > 0) {
          await this.saveHistoricalData(symbol, startDate, endDate, data);
          return data;
        }
      } catch (error) {
        console.log(`⚠️ Source failed: ${error.message}`);
        continue;
      }
    }

    throw new Error('All data sources failed');
  }

  /**
   * Fetches data from CoinGecko (free, no API key required)
   */
  async fetchFromCoinGecko(symbol, startDate, endDate) {
    console.log('🔄 Trying CoinGecko API...');
    
    // Convert symbol to CoinGecko format
    const coinGeckoId = this.symbolToCoinGeckoId(symbol);
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    const url = `https://api.coingecko.com/api/v3/coins/${coinGeckoId}/market_chart/range`;
    
    const response = await axios.get(url, {
      params: {
        vs_currency: 'usd',
        from: startTimestamp,
        to: endTimestamp
      },
      timeout: 30000
    });

    const prices = response.data.prices || [];
    console.log(`✅ CoinGecko: Retrieved ${prices.length} data points`);

    return prices.map(([timestamp, price]) => ({
      timestamp: new Date(timestamp),
      open: price,
      high: price * 1.002, // Approximate high
      low: price * 0.998,  // Approximate low
      close: price,
      volume: 1000000, // Placeholder volume
      source: 'coingecko'
    }));
  }

  /**
   * Fetches data from Alpha Vantage (requires free API key)
   */
  async fetchFromAlphaVantage(symbol, startDate, endDate) {
    console.log('🔄 Trying Alpha Vantage API...');
    
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    const cryptoSymbol = symbol.replace('USDT', '');
    
    const url = 'https://www.alphavantage.co/query';
    
    const response = await axios.get(url, {
      params: {
        function: 'DIGITAL_CURRENCY_DAILY',
        symbol: cryptoSymbol,
        market: 'USD',
        apikey: apiKey
      },
      timeout: 30000
    });

    const timeSeries = response.data['Time Series (Digital Currency Daily)'];
    if (!timeSeries) {
      throw new Error('No data from Alpha Vantage');
    }

    const data = [];
    for (const [date, values] of Object.entries(timeSeries)) {
      const timestamp = new Date(date);
      if (timestamp >= new Date(startDate) && timestamp <= new Date(endDate)) {
        data.push({
          timestamp,
          open: parseFloat(values['1a. open (USD)']),
          high: parseFloat(values['2a. high (USD)']),
          low: parseFloat(values['3a. low (USD)']),
          close: parseFloat(values['4a. close (USD)']),
          volume: parseFloat(values['5. volume']),
          source: 'alphavantage'
        });
      }
    }

    console.log(`✅ Alpha Vantage: Retrieved ${data.length} data points`);
    return data.reverse(); // Sort chronologically
  }

  /**
   * Fetches data from CryptoCompare (free tier available)
   */
  async fetchFromCryptoCompare(symbol, startDate, endDate) {
    console.log('🔄 Trying CryptoCompare API...');
    
    const cryptoSymbol = symbol.replace('USDT', '');
    const toTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
    
    const url = 'https://min-api.cryptocompare.com/data/v2/histoday';
    
    const response = await axios.get(url, {
      params: {
        fsym: cryptoSymbol,
        tsym: 'USD',
        toTs: toTimestamp,
        limit: 100 // Last 100 days
      },
      timeout: 30000
    });

    const data = response.data.Data?.Data || [];
    console.log(`✅ CryptoCompare: Retrieved ${data.length} data points`);

    return data.map(item => ({
      timestamp: new Date(item.time * 1000),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volumeto,
      source: 'cryptocompare'
    }));
  }

  /**
   * Fetches data from Yahoo Finance (alternative source)
   */
  async fetchFromYahooFinance(symbol, startDate, endDate) {
    console.log('🔄 Trying Yahoo Finance API...');
    
    // Convert crypto symbol to Yahoo format
    const yahooSymbol = this.symbolToYahooFormat(symbol);
    
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
    
    const response = await axios.get(url, {
      params: {
        period1: startTimestamp,
        period2: endTimestamp,
        interval: '1d',
        includePrePost: false
      },
      timeout: 30000
    });

    const result = response.data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0];
    
    const data = timestamps.map((timestamp, index) => ({
      timestamp: new Date(timestamp * 1000),
      open: quotes.open[index],
      high: quotes.high[index],
      low: quotes.low[index],
      close: quotes.close[index],
      volume: quotes.volume[index],
      source: 'yahoo'
    }));

    console.log(`✅ Yahoo Finance: Retrieved ${data.length} data points`);
    return data;
  }

  /**
   * Generates synthetic order book data from price data
   */
  generateOrderBookFromPrice(priceData, depth = 50) {
    return priceData.map(candle => {
      const bids = [];
      const asks = [];
      
      // Generate realistic bid/ask spread
      const spread = candle.close * 0.001; // 0.1% spread
      const bidPrice = candle.close - spread / 2;
      const askPrice = candle.close + spread / 2;
      
      // Generate order book levels
      for (let i = 0; i < depth; i++) {
        const bidLevel = bidPrice - (i * candle.close * 0.0001);
        const askLevel = askPrice + (i * candle.close * 0.0001);
        
        const bidVolume = Math.random() * 10 + 1;
        const askVolume = Math.random() * 10 + 1;
        
        bids.push([bidLevel, bidVolume]);
        asks.push([askLevel, askVolume]);
      }
      
      return {
        timestamp: candle.timestamp,
        price: candle.close,
        bids,
        asks,
        volume: candle.volume
      };
    });
  }

  /**
   * Saves historical data to file
   */
  async saveHistoricalData(symbol, startDate, endDate, data) {
    const filename = `${symbol}_${startDate}_${endDate}.json`;
    const filepath = path.join(this.dataDir, filename);
    
    const dataToSave = {
      symbol,
      startDate,
      endDate,
      dataPoints: data.length,
      fetchedAt: new Date().toISOString(),
      data
    };
    
    await fs.writeFile(filepath, JSON.stringify(dataToSave, null, 2));
    console.log(`💾 Data saved to: ${filepath}`);
  }

  /**
   * Loads historical data from file
   */
  async loadHistoricalData(symbol, startDate, endDate) {
    const filename = `${symbol}_${startDate}_${endDate}.json`;
    const filepath = path.join(this.dataDir, filename);
    
    try {
      const fileContent = await fs.readFile(filepath, 'utf8');
      const data = JSON.parse(fileContent);
      console.log(`📁 Loaded ${data.dataPoints} data points from cache`);
      return data.data;
    } catch (error) {
      return null; // File doesn't exist
    }
  }

  /**
   * Fetches data for known flash crash events
   */
  async fetchCrashEventData() {
    const crashEvents = [
      {
        name: 'Bitcoin May 2021 Crash',
        symbol: 'BTCUSDT',
        startDate: '2021-05-18',
        endDate: '2021-05-20',
        description: 'Bitcoin flash crash from $43K to $30K'
      },
      {
        name: 'Ethereum June 2022 Crash',
        symbol: 'ETHUSDT',
        startDate: '2022-06-17',
        endDate: '2022-06-19',
        description: 'Ethereum crash during market selloff'
      },
      {
        name: 'Solana September 2021',
        symbol: 'SOLUSDT',
        startDate: '2021-09-06',
        endDate: '2021-09-08',
        description: 'Solana flash crash'
      },
      {
        name: 'FTX Collapse November 2022',
        symbol: 'BTCUSDT',
        startDate: '2022-11-08',
        endDate: '2022-11-10',
        description: 'Bitcoin crash during FTX collapse'
      }
    ];

    const results = [];
    
    for (const event of crashEvents) {
      console.log(`\n🔍 Fetching data for: ${event.name}`);
      
      try {
        // Try to load from cache first
        let data = await this.loadHistoricalData(event.symbol, event.startDate, event.endDate);
        
        if (!data) {
          // Fetch fresh data
          data = await this.fetchHistoricalData(event.symbol, event.startDate, event.endDate);
        }
        
        // Generate order book data
        const orderBookData = this.generateOrderBookFromPrice(data);
        
        results.push({
          ...event,
          priceData: data,
          orderBookData,
          dataPoints: data.length
        });
        
        console.log(`✅ ${event.name}: ${data.length} data points ready`);
        
      } catch (error) {
        console.log(`❌ Failed to fetch ${event.name}: ${error.message}`);
      }
    }
    
    return results;
  }

  /**
   * Helper methods for symbol conversion
   */
  symbolToCoinGeckoId(symbol) {
    const mapping = {
      'BTCUSDT': 'bitcoin',
      'ETHUSDT': 'ethereum',
      'SOLUSDT': 'solana',
      'ADAUSDT': 'cardano',
      'DOGEUSDT': 'dogecoin',
      'BNBUSDT': 'binancecoin'
    };
    return mapping[symbol] || 'bitcoin';
  }

  symbolToYahooFormat(symbol) {
    const mapping = {
      'BTCUSDT': 'BTC-USD',
      'ETHUSDT': 'ETH-USD',
      'SOLUSDT': 'SOL-USD',
      'ADAUSDT': 'ADA-USD',
      'DOGEUSDT': 'DOGE-USD',
      'BNBUSDT': 'BNB-USD'
    };
    return mapping[symbol] || 'BTC-USD';
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const fetcher = new HistoricalDataFetcher();
  
  if (process.argv[2] === 'crash-events') {
    // Fetch all known crash events
    fetcher.fetchCrashEventData().then(results => {
      console.log(`\n🎉 Fetched data for ${results.length} crash events`);
      console.log('📁 Data saved in ./backtest-data/ directory');
      console.log('🚀 Ready for backtesting!');
    }).catch(console.error);
  } else {
    // Fetch specific symbol and date range
    const symbol = process.argv[2] || 'BTCUSDT';
    const startDate = process.argv[3] || '2021-05-18';
    const endDate = process.argv[4] || '2021-05-20';
    
    fetcher.fetchHistoricalData(symbol, startDate, endDate).then(data => {
      console.log(`\n✅ Fetched ${data.length} data points for ${symbol}`);
      console.log('🚀 Ready for backtesting!');
    }).catch(console.error);
  }
}

export default HistoricalDataFetcher;
