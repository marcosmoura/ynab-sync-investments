import { Injectable, Logger } from '@nestjs/common';

import { convertCurrency, fetchWithTimeout } from '../../utils';
import { AssetResult, MarketDataProvider } from '../types';

@Injectable()
export class FinnhubService implements MarketDataProvider {
  private readonly logger = new Logger(FinnhubService.name);
  private readonly timeout = 10000;
  private readonly finnhubApiLimit = 60; // Free tier limit per minute
  private finnhubRequestCount = 0;
  private lastFinnhubResetTime = Date.now();

  getProviderName(): string {
    return 'Finnhub';
  }

  isAvailable(): boolean {
    return !!process.env.FINNHUB_API_KEY;
  }

  async isCrypto(symbol: string, apiKey: string): Promise<boolean> {
    let supportedCryptoSymbols: Set<string> | null = null;

    this.logger.log(`Finnhub checking if ${symbol} is a crypto asset`);

    try {
      const url = `https://finnhub.io/api/v1/crypto/symbol?exchange=BINANCE&token=${apiKey}`;
      const response = await fetchWithTimeout(url, this.timeout);

      if (!response.ok) {
        supportedCryptoSymbols = new Set();
      }

      const data = await response.json();

      supportedCryptoSymbols = new Set((data as { symbol: string }[]).map((item) => item.symbol));
    } catch {
      supportedCryptoSymbols = new Set();
    }

    return supportedCryptoSymbols.has(`BINANCE:${symbol.toUpperCase()}USDT`);
  }

  async fetchAssetPrices(symbols: string[], targetCurrency: string): Promise<AssetResult[]> {
    if (!symbols.length) return [];

    this.logger.log(`======= Finnhub fetching prices for symbols: [${symbols.join(', ')}] =======`);

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      throw new Error('Finnhub API key not configured');
    }

    // Check and reset rate limit counter
    const now = Date.now();
    if (now - this.lastFinnhubResetTime >= 60000) {
      this.finnhubRequestCount = 0;
      this.lastFinnhubResetTime = now;
    }

    // Wait if we've hit the rate limit
    if (this.finnhubRequestCount >= this.finnhubApiLimit) {
      const waitTime = 60000 - (now - this.lastFinnhubResetTime);
      this.logger.log(`Finnhub rate limit reached, waiting ${waitTime}ms`);

      await new Promise((resolve) => setTimeout(resolve, waitTime));

      this.finnhubRequestCount = 0;
      this.lastFinnhubResetTime = Date.now();
    }

    const results: AssetResult[] = [];

    for (const symbol of symbols) {
      try {
        this.finnhubRequestCount++;
        const currentTime = Date.now();

        if (currentTime - this.lastFinnhubResetTime >= 60000) {
          this.finnhubRequestCount = 0;
          this.lastFinnhubResetTime = currentTime;
        }

        let finnhubSymbol = symbol;
        const isCryptoAsset = await this.isCrypto(symbol, apiKey);

        if (isCryptoAsset) {
          finnhubSymbol = `BINANCE:${symbol.toUpperCase()}USDT`;
        }

        const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${apiKey}`;
        this.logger.debug(
          `Finnhub making request for ${symbol} (as ${finnhubSymbol}): ${quoteUrl}`,
        );

        const response = await fetchWithTimeout(quoteUrl, this.timeout);
        this.logger.debug(
          `Finnhub response for ${symbol}: ${response.status} ${response.statusText}`,
        );

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.debug(`Finnhub error for ${symbol}: ${response.status} - ${errorText}`);
          continue;
        }

        const data = await response.json();

        if (data.c && data.c > 0) {
          let price = data.c;

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
            currency: targetCurrency,
          });
          this.logger.debug(`Successfully fetched ${symbol}: $${price}`);
        } else {
          this.logger.debug(`No valid price data found for ${symbol} in Finnhub`);
        }
      } catch (error) {
        this.logger.debug(`Finnhub request error for ${symbol}: ${error.message}`);
        continue;
      }
    }
    return results;
  }
}
