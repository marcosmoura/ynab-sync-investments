import { Injectable, Logger } from '@nestjs/common';

import { AssetPriceResponseDto } from './dto';

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
}

interface CoinGeckoSearchResponse {
  coins: CoinGeckoCoin[];
}

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly timeout = 10000;

  async getAssetPrice(
    symbol: string,
    targetCurrency = 'USD',
  ): Promise<Omit<AssetPriceResponseDto, 'timestamp'>> {
    try {
      const price = await this.fetchPriceFromAPI(symbol, targetCurrency);

      return {
        symbol,
        price,
        currency: targetCurrency,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch price for ${symbol}`, error);
      throw new Error(
        `Failed to fetch price for ${symbol}: Unable to find asset in crypto or stock markets`,
      );
    }
  }

  private async fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async fetchPriceFromAPI(symbol: string, targetCurrency: string): Promise<number> {
    let cryptoError: Error | null = null;
    let stockError: Error | null = null;

    // First try to search for crypto
    try {
      return await this.getCryptoPrice(symbol, targetCurrency);
    } catch (error) {
      cryptoError = error as Error;
      this.logger.debug(`Failed to fetch as crypto: ${error.message}`);
    }

    // If crypto fails, try as stock
    try {
      return await this.getStockPrice(symbol, targetCurrency);
    } catch (error) {
      stockError = error as Error;
      this.logger.debug(`Failed to fetch as stock: ${error.message}`);
    }

    // If both fail, throw a comprehensive error
    throw new Error(
      `Symbol ${symbol} not found in crypto markets (${cryptoError?.message}) or stock markets (${stockError?.message})`,
    );
  }

  private async getCryptoPrice(symbol: string, targetCurrency: string): Promise<number> {
    try {
      // Search for the coin using CoinGecko search API
      const coinId = await this.searchCoinId(symbol);
      const currency = targetCurrency.toLowerCase();

      // CoinGecko API call - free tier allows 30 calls/minute
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}`;

      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data[coinId] || !data[coinId][currency]) {
        throw new Error(`Price not found for cryptocurrency ${symbol} in ${targetCurrency}`);
      }

      return data[coinId][currency];
    } catch (error) {
      this.logger.debug(`Failed to fetch crypto price for ${symbol}: ${error.message}`);
      throw error;
    }
  }

  private async searchCoinId(symbol: string): Promise<string> {
    try {
      const url = `https://api.coingecko.com/api/v3/search?query=${symbol}`;

      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`CoinGecko search API error: ${response.status} ${response.statusText}`);
      }

      const data: CoinGeckoSearchResponse = await response.json();

      // Look for exact symbol match first
      const exactMatch = data.coins?.find(
        (coin: CoinGeckoCoin) => coin.symbol?.toLowerCase() === symbol.toLowerCase(),
      );

      if (exactMatch) {
        return exactMatch.id;
      }

      // If no exact match, take the first result
      if (data.coins && data.coins.length > 0) {
        return data.coins[0].id;
      }

      throw new Error(`No cryptocurrency found for symbol ${symbol}`);
    } catch (error) {
      this.logger.debug(`Failed to search for coin ID for symbol ${symbol}: ${error.message}`);
      throw error;
    }
  }

  private async getStockPrice(symbol: string, targetCurrency: string): Promise<number> {
    try {
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

      if (!apiKey) {
        throw new Error('Alpha Vantage API key not configured');
      }

      // Alpha Vantage Global Quote API
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;

      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Check for API rate limit or error
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
      }

      if (data['Note']) {
        throw new Error('Alpha Vantage API rate limit exceeded');
      }

      const globalQuote = data['Global Quote'];
      if (!globalQuote || !globalQuote['05. price']) {
        throw new Error(`No stock/investment found for symbol ${symbol}`);
      }

      const priceInUSD = parseFloat(globalQuote['05. price']);

      // Convert to target currency if needed
      if (targetCurrency.toUpperCase() !== 'USD') {
        try {
          return await this.convertCurrency(priceInUSD, 'USD', targetCurrency);
        } catch (error) {
          this.logger.warn(`Currency conversion failed, returning USD price: ${error.message}`);
          return priceInUSD;
        }
      }

      return priceInUSD;
    } catch (error) {
      this.logger.debug(`Failed to fetch stock price for ${symbol}: ${error.message}`);
      throw error;
    }
  }

  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
      return amount;
    }

    try {
      // Using exchangerate-api.com free tier (1500 requests/month)
      const url = `https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`;

      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`Currency API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.rates || !data.rates[toCurrency.toUpperCase()]) {
        throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
      }

      const exchangeRate = data.rates[toCurrency.toUpperCase()];
      const convertedAmount = amount * exchangeRate;

      this.logger.log(
        `Converted ${amount} ${fromCurrency} to ${convertedAmount} ${toCurrency} (rate: ${exchangeRate})`,
      );

      return convertedAmount;
    } catch (error) {
      this.logger.error(`Failed to convert ${amount} from ${fromCurrency} to ${toCurrency}`, error);

      // Fallback: return original amount with warning
      this.logger.warn(`Currency conversion failed, returning original amount`);
      return amount;
    }
  }
}
