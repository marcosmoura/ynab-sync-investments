import { Injectable, Logger } from '@nestjs/common';
import yahooFinance from 'yahoo-finance2';

import { convertCurrency } from '@/market-data/utils';

import { AssetResult, MarketDataProvider } from '../types';

@Injectable()
export class YahooFinanceService implements MarketDataProvider {
  private readonly logger = new Logger(YahooFinanceService.name);
  private readonly timeout = 10000;

  getProviderName(): string {
    return 'YahooFinance';
  }

  isAvailable(): boolean {
    // Yahoo Finance is always available (no API key required for public quotes)
    return true;
  }

  async fetchAssetPrices(symbols: string[], targetCurrency = 'USD'): Promise<AssetResult[]> {
    if (!symbols.length) {
      return [];
    }

    this.logger.log(`YahooFinance fetching prices for symbols: [${symbols.join(', ')}]`);

    const results: AssetResult[] = [];

    for (const symbol of symbols) {
      try {
        const quote = await yahooFinance.quote(symbol);

        if (!quote) {
          this.logger.warn(`No quote found for symbol: ${symbol}`);

          continue;
        }

        let price = quote.regularMarketPrice ?? 0;
        const currency = quote.currency ?? targetCurrency;

        if (targetCurrency.toUpperCase() !== 'USD') {
          try {
            price = await convertCurrency(price, 'USD', targetCurrency, this.timeout);
          } catch {
            this.logger.warn(`Currency conversion failed for ${symbol}, using USD price`);
          }
        }

        results.push({
          symbol,
          price,
          currency,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Yahoo Finance fetch error';

        this.logger.error(`YahooFinance error for symbol ${symbol}: ${errorMsg}`);

        results.push({
          symbol,
          price: 0,
          currency: targetCurrency,
        });
      }
    }
    return results;
  }
}
