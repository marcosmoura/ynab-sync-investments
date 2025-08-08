import { Injectable, Logger } from '@nestjs/common';

import { convertCurrency, fetchWithTimeout } from '../../utils';
import { AssetResult, MarketDataProvider } from '../types';

interface AlphaVantageQuoteResponse {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
  'Error Message'?: string;
  Note?: string;
}

@Injectable()
export class AlphaVantageService implements MarketDataProvider {
  private readonly logger = new Logger(AlphaVantageService.name);
  private readonly timeout = 10000;

  getProviderName(): string {
    return 'Alpha Vantage';
  }

  isAvailable(): boolean {
    return !!process.env.ALPHA_VANTAGE_API_KEY;
  }

  async fetchAssetPrices(symbols: string[], targetCurrency: string): Promise<AssetResult[]> {
    if (!symbols.length) return [];

    this.logger.log(
      `======= Alpha Vantage fetching prices for symbols: [${symbols.join(', ')}] =======`,
    );

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    const results: AssetResult[] = [];

    // Alpha Vantage has a free tier limit of 25 requests per day, 5 requests per minute
    // We'll process symbols one by one with a small delay
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];

      try {
        // Add a small delay between requests to respect rate limits (12 seconds = 5 per minute)
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 12000));
        }

        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;

        this.logger.debug(`Alpha Vantage making request for ${symbol}: ${url}`);
        const response = await fetchWithTimeout(url, this.timeout);

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.debug(`Alpha Vantage error for ${symbol}: ${response.status} - ${errorText}`);
          continue; // Try next symbol
        }

        const data: AlphaVantageQuoteResponse = await response.json();

        // Check if we got valid data
        if (data['Global Quote'] && data['Global Quote']['05. price']) {
          const quote = data['Global Quote'];
          let price = parseFloat(quote['05. price']);

          // Convert currency if needed (Alpha Vantage typically returns USD)
          if (targetCurrency.toUpperCase() !== 'USD') {
            try {
              price = await convertCurrency(price, 'USD', targetCurrency, this.timeout);
            } catch {
              this.logger.warn(`Currency conversion failed for ${symbol}, using USD price`);
            }
          }

          results.push({
            symbol: quote['01. symbol'],
            price,
            currency: targetCurrency,
          });

          this.logger.debug(`Successfully fetched ${symbol}: $${price}`);
        } else if (data['Error Message']) {
          this.logger.debug(`Alpha Vantage error for ${symbol}: ${data['Error Message']}`);
        } else if (data['Note']) {
          // Rate limit hit
          this.logger.warn(`Alpha Vantage rate limit hit: ${data['Note']}`);
          break; // Stop processing more symbols
        } else {
          this.logger.debug(`No data found for ${symbol} in Alpha Vantage`);
        }
      } catch (error) {
        this.logger.debug(`Alpha Vantage request error for ${symbol}: ${error.message}`);
        continue; // Try next symbol
      }
    }

    return results;
  }
}
