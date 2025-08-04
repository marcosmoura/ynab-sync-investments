import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

import { AssetPriceResponseDto } from '../dto';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 10000,
    });
  }

  async getAssetPrice(
    symbol: string,
    targetCurrency = 'USD',
  ): Promise<Omit<AssetPriceResponseDto, 'timestamp'>> {
    try {
      // For this implementation, we'll use a free API like Alpha Vantage or similar
      // For now, let's use a mock implementation that could be extended
      // In a real implementation, you'd integrate with APIs like:
      // - Alpha Vantage for stocks
      // - CoinGecko for crypto
      // - Yahoo Finance API

      const price = await this.fetchPriceFromAPI(symbol, targetCurrency);

      return {
        symbol,
        price,
        currency: targetCurrency,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch price for ${symbol}`, error);
      throw new Error(`Failed to fetch price for ${symbol}`);
    }
  }

  private async fetchPriceFromAPI(symbol: string, targetCurrency: string): Promise<number> {
    // Mock implementation - in a real app, you'd call actual APIs
    // For demonstration purposes, returning mock data
    //
    // Example integrations:
    // 1. For stocks: Alpha Vantage, Yahoo Finance
    // 2. For crypto: CoinGecko, CoinMarketCap
    // 3. For forex: Fixer.io, OpenExchangeRates

    try {
      // This is a placeholder - implement actual API calls based on asset type
      if (this.isCryptoSymbol(symbol)) {
        return await this.getCryptoPrice(symbol, targetCurrency);
      } else {
        return await this.getStockPrice(symbol, targetCurrency);
      }
    } catch {
      this.logger.warn(`API call failed for ${symbol}, using fallback`);
      // Fallback prices for testing
      const mockPrices: Record<string, number> = {
        AAPL: 150.0,
        MSFT: 300.0,
        GOOGL: 2500.0,
        BTC: 45000.0,
        ETH: 3000.0,
      };

      return mockPrices[symbol.toUpperCase()] || 100.0;
    }
  }

  private async getCryptoPrice(symbol: string, targetCurrency: string): Promise<number> {
    // Example CoinGecko API call (you'd need to implement this)
    // const response = await this.axiosInstance.get(
    //   `https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=${targetCurrency}`
    // );
    // return response.data[symbol][targetCurrency.toLowerCase()];

    console.log(symbol, targetCurrency);

    // Mock implementation
    return 100.0;
  }

  private async getStockPrice(symbol: string, targetCurrency: string): Promise<number> {
    // Example Alpha Vantage API call (you'd need an API key)
    // const response = await this.axiosInstance.get(
    //   `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
    // );
    // return parseFloat(response.data['Global Quote']['05. price']);

    console.log(symbol, targetCurrency);

    // Mock implementation
    return 100.0;
  }

  private isCryptoSymbol(symbol: string): boolean {
    const cryptoSymbols = ['BTC', 'ETH', 'ADA', 'DOT', 'SOL', 'MATIC', 'AVAX'];
    return cryptoSymbols.includes(symbol.toUpperCase());
  }

  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    try {
      // In a real implementation, you'd use a currency conversion API
      // For now, returning the same amount (assuming same currency or mock conversion)
      return amount;
    } catch (error) {
      this.logger.error(`Failed to convert ${amount} from ${fromCurrency} to ${toCurrency}`, error);
      return amount; // Fallback to original amount
    }
  }
}
