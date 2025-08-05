import { Injectable, Logger } from '@nestjs/common';

import { AssetPriceResponseDto } from './dto';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly timeout = 10000;

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
    try {
      if (this.isCryptoSymbol(symbol)) {
        return await this.getCryptoPrice(symbol, targetCurrency);
      } else {
        return await this.getStockPrice(symbol, targetCurrency);
      }
    } catch (error) {
      this.logger.warn(`API call failed for ${symbol}: ${error.message}, using fallback`);

      // Fallback prices for testing/development
      const mockPrices: Record<string, number> = {
        AAPL: 150.0,
        MSFT: 300.0,
        GOOGL: 2500.0,
        TSLA: 800.0,
        AMZN: 3200.0,
        BTC: 45000.0,
        ETH: 3000.0,
        ADA: 0.5,
        DOT: 25.0,
        SOL: 100.0,
      };

      const fallbackPrice = mockPrices[symbol.toUpperCase()];
      if (fallbackPrice) {
        this.logger.log(`Using fallback price for ${symbol}: ${fallbackPrice}`);
        return fallbackPrice;
      }

      // If no fallback available, re-throw the original error
      throw new Error(`Failed to fetch price for ${symbol}: ${error.message}`);
    }
  }

  private async getCryptoPrice(symbol: string, targetCurrency: string): Promise<number> {
    try {
      // Map common crypto symbols to CoinGecko IDs
      const symbolToId: Record<string, string> = {
        BTC: 'bitcoin',
        ETH: 'ethereum',
        ADA: 'cardano',
        DOT: 'polkadot',
        SOL: 'solana',
        MATIC: 'polygon',
        AVAX: 'avalanche-2',
        USDT: 'tether',
        USDC: 'usd-coin',
        BNB: 'binancecoin',
        XRP: 'ripple',
        LUNA: 'terra-luna',
        ATOM: 'cosmos',
        LINK: 'chainlink',
        UNI: 'uniswap',
        AAVE: 'aave',
        CRV: 'curve-dao-token',
        COMP: 'compound-governance-token',
        MKR: 'maker',
        SNX: 'havven',
        YFI: 'yearn-finance',
      };

      const coinId = symbolToId[symbol.toUpperCase()] || symbol.toLowerCase();
      const currency = targetCurrency.toLowerCase();

      // CoinGecko API call - free tier allows 30 calls/minute
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}`;

      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data[coinId] || !data[coinId][currency]) {
        throw new Error(`Price not found for ${symbol} in ${targetCurrency}`);
      }

      return data[coinId][currency];
    } catch (error) {
      this.logger.error(`Failed to fetch crypto price for ${symbol}`, error);
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
        throw new Error(`Price not found for symbol ${symbol}`);
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
      this.logger.error(`Failed to fetch stock price for ${symbol}`, error);
      throw error;
    }
  }

  private isCryptoSymbol(symbol: string): boolean {
    const cryptoSymbols = [
      'BTC',
      'ETH',
      'ADA',
      'DOT',
      'SOL',
      'MATIC',
      'AVAX',
      'USDT',
      'USDC',
      'BNB',
      'XRP',
      'LUNA',
      'ATOM',
      'LINK',
      'UNI',
      'AAVE',
      'CRV',
      'COMP',
      'MKR',
      'SNX',
      'YFI',
    ];
    return cryptoSymbols.includes(symbol.toUpperCase());
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
