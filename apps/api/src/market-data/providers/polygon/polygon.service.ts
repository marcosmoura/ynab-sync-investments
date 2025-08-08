import { Injectable, Logger } from '@nestjs/common';

import { convertCurrency, fetchWithTimeout } from '../../utils';
import { AssetResult, MarketDataProvider } from '../types';

@Injectable()
export class PolygonService implements MarketDataProvider {
  private readonly logger = new Logger(PolygonService.name);
  private readonly timeout = 10000;
  private readonly polygonApiLimit = 5; // Free tier limit per minute
  private polygonRequestCount = 0;
  private lastPolygonResetTime = Date.now();

  getProviderName(): string {
    return 'Polygon.io';
  }

  isAvailable(): boolean {
    return !!process.env.POLYGON_API_KEY;
  }

  async fetchAssetPrices(symbols: string[], targetCurrency: string): Promise<AssetResult[]> {
    if (!symbols.length) return [];

    this.logger.log(
      `======= Polygon.io fetching prices for symbols: [${symbols.join(', ')}] =======`,
    );

    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey) {
      throw new Error('Polygon API key not configured');
    }

    // Check and reset rate limit counter
    const now = Date.now();
    if (now - this.lastPolygonResetTime >= 60000) {
      this.polygonRequestCount = 0;
      this.lastPolygonResetTime = now;
    }

    // Wait if we've hit the rate limit
    if (this.polygonRequestCount >= this.polygonApiLimit) {
      const waitTime = 60000 - (now - this.lastPolygonResetTime);
      this.logger.log(`Polygon.io rate limit reached, waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.polygonRequestCount = 0;
      this.lastPolygonResetTime = Date.now();
    }

    const results: AssetResult[] = [];
    const remainingSymbolsToFetch = [...symbols];

    // Try stocks first
    const stockResults = await this.fetchStocksFromPolygon(
      remainingSymbolsToFetch,
      targetCurrency,
      apiKey,
    );
    results.push(...stockResults);

    // Remove found symbols from remaining list
    stockResults.forEach((result) => {
      const index = remainingSymbolsToFetch.findIndex(
        (s) => s.toUpperCase() === result.symbol.toUpperCase(),
      );
      if (index !== -1) {
        remainingSymbolsToFetch.splice(index, 1);
      }
    });

    // Try indices for remaining symbols if we still have symbols to fetch
    if (remainingSymbolsToFetch.length > 0) {
      const indicesResults = await this.fetchIndicesFromPolygon(
        remainingSymbolsToFetch,
        targetCurrency,
        apiKey,
      );
      results.push(...indicesResults);
    }

    return results;
  }

  private async fetchStocksFromPolygon(
    symbols: string[],
    targetCurrency: string,
    apiKey: string,
  ): Promise<AssetResult[]> {
    if (!symbols.length) return [];

    const results: AssetResult[] = [];

    // Try individual stock quotes first (more reliable)
    for (const symbol of symbols) {
      try {
        this.polygonRequestCount++;

        // Check rate limit before each request
        const now = Date.now();
        if (now - this.lastPolygonResetTime >= 60000) {
          this.polygonRequestCount = 0;
          this.lastPolygonResetTime = now;
        }

        if (this.polygonRequestCount > this.polygonApiLimit) {
          const waitTime = 60000 - (now - this.lastPolygonResetTime);
          this.logger.log(`Polygon.io rate limit reached, waiting ${waitTime}ms`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          this.polygonRequestCount = 1;
          this.lastPolygonResetTime = Date.now();
        }

        // Use the previous day's close price endpoint
        const stockUrl = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev?adjusted=true&apikey=${apiKey}`;

        this.logger.debug(`Polygon.io making request for ${symbol}: ${stockUrl}`);
        const response = await fetchWithTimeout(stockUrl, this.timeout);

        this.logger.debug(
          `Polygon.io response for ${symbol}: ${response.status} ${response.statusText}`,
        );

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.debug(`Polygon.io error for ${symbol}: ${response.status} - ${errorText}`);
          continue; // Try next symbol
        }

        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          let price = result.c; // Close price

          // Convert currency if needed (Polygon returns USD)
          if (targetCurrency.toUpperCase() !== 'USD') {
            try {
              price = await convertCurrency(price, 'USD', targetCurrency, this.timeout);
            } catch {
              this.logger.warn(`Currency conversion failed for ${symbol}, using USD price`);
            }
          }

          results.push({
            symbol: symbol,
            price,
            currency: targetCurrency,
          });

          this.logger.debug(`Successfully fetched ${symbol}: $${price}`);
        } else {
          this.logger.debug(`No data found for ${symbol} in Polygon.io`);
        }
      } catch (error) {
        this.logger.debug(`Polygon.io request error for ${symbol}: ${error.message}`);
        continue; // Try next symbol
      }
    }

    return results;
  }

  private async fetchIndicesFromPolygon(
    symbols: string[],
    targetCurrency: string,
    apiKey: string,
  ): Promise<AssetResult[]> {
    if (!symbols.length) return [];

    const results: AssetResult[] = [];

    // Try individual index quotes
    for (const symbol of symbols) {
      try {
        // Check rate limit before each request
        const now = Date.now();
        if (now - this.lastPolygonResetTime >= 60000) {
          this.polygonRequestCount = 0;
          this.lastPolygonResetTime = now;
        }

        if (this.polygonRequestCount > this.polygonApiLimit) {
          const waitTime = 60000 - (now - this.lastPolygonResetTime);
          this.logger.log(`Polygon.io rate limit reached for indices, waiting ${waitTime}ms`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          this.polygonRequestCount = 1;
          this.lastPolygonResetTime = Date.now();
        }

        this.polygonRequestCount++;

        // Use the previous day's close price endpoint for indices
        const indexUrl = `https://api.polygon.io/v2/aggs/ticker/I:${encodeURIComponent(symbol)}/prev?adjusted=true&apikey=${apiKey}`;

        this.logger.debug(`Polygon.io making index request for ${symbol}: ${indexUrl}`);
        const response = await fetchWithTimeout(indexUrl, this.timeout);

        this.logger.debug(
          `Polygon.io index response for ${symbol}: ${response.status} ${response.statusText}`,
        );

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.debug(
            `Polygon.io index error for ${symbol}: ${response.status} - ${errorText}`,
          );
          continue; // Try next symbol
        }

        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          let price = result.c; // Close price

          // Convert currency if needed (Polygon returns USD)
          if (targetCurrency.toUpperCase() !== 'USD') {
            try {
              price = await convertCurrency(price, 'USD', targetCurrency, this.timeout);
            } catch {
              this.logger.warn(`Currency conversion failed for index ${symbol}, using USD price`);
            }
          }

          results.push({
            symbol: symbol,
            price,
            currency: targetCurrency,
          });

          this.logger.debug(`Successfully fetched index ${symbol}: $${price}`);
        } else {
          this.logger.debug(`No data found for index ${symbol} in Polygon.io`);
        }
      } catch (error) {
        this.logger.debug(`Polygon.io index request error for ${symbol}: ${error.message}`);
        continue; // Try next symbol
      }
    }

    return results;
  }
}
