import { Injectable, Logger } from '@nestjs/common';

import { convertCurrency, fetchWithTimeout } from '../../utils';
import { AssetResult, MarketDataProvider } from '../types';

interface FMPQuoteResponse {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  exchange: string;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
}

@Injectable()
export class FMPService implements MarketDataProvider {
  private readonly logger = new Logger(FMPService.name);
  private readonly timeout = 10000;
  private readonly fmpApiLimit = 250; // Free tier limit per day
  private fmpRequestCount = 0;
  private lastFmpResetTime = Date.now();

  getProviderName(): string {
    return 'Financial Modeling Prep';
  }

  isAvailable(): boolean {
    return !!process.env.FMP_API_KEY;
  }

  async fetchAssetPrices(symbols: string[], targetCurrency: string): Promise<AssetResult[]> {
    if (!symbols.length) return [];

    this.logger.log(
      `======= Financial Modeling Prep fetching prices for symbols: [${symbols.join(', ')}] =======`,
    );

    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      throw new Error('Financial Modeling Prep API key not configured');
    }

    // Check and reset rate limit counter (daily limit)
    const now = Date.now();
    if (now - this.lastFmpResetTime >= 86400000) {
      // 24 hours
      this.fmpRequestCount = 0;
      this.lastFmpResetTime = now;
    }

    // Check if we've hit the daily limit
    if (this.fmpRequestCount >= this.fmpApiLimit) {
      this.logger.warn('Financial Modeling Prep daily API limit reached');
      return [];
    }

    const results: AssetResult[] = [];
    const remainingSymbolsToFetch = [...symbols];

    // Try stocks first (covers European stocks)
    const stockResults = await this.fetchStocksFromFMP(
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

    // Try ETFs for remaining symbols
    if (remainingSymbolsToFetch.length > 0) {
      const etfResults = await this.fetchETFsFromFMP(
        remainingSymbolsToFetch,
        targetCurrency,
        apiKey,
      );
      results.push(...etfResults);

      // Remove found symbols from remaining list
      etfResults.forEach((result) => {
        const index = remainingSymbolsToFetch.findIndex(
          (s) => s.toUpperCase() === result.symbol.toUpperCase(),
        );
        if (index !== -1) {
          remainingSymbolsToFetch.splice(index, 1);
        }
      });
    }

    // Try indices for remaining symbols
    if (remainingSymbolsToFetch.length > 0) {
      const indicesResults = await this.fetchIndicesFromFMP(
        remainingSymbolsToFetch,
        targetCurrency,
        apiKey,
      );
      results.push(...indicesResults);
    }

    return results;
  }

  private async fetchStocksFromFMP(
    symbols: string[],
    targetCurrency: string,
    apiKey: string,
  ): Promise<AssetResult[]> {
    if (!symbols.length) return [];

    const results: AssetResult[] = [];

    // Try batch quote first for efficiency
    try {
      this.fmpRequestCount++;

      // Check daily limit
      if (this.fmpRequestCount > this.fmpApiLimit) {
        this.logger.warn('Financial Modeling Prep daily API limit reached during stock fetch');
        return results;
      }

      // FMP supports batch quotes with comma-separated symbols
      const symbolList = symbols.join(',');
      const batchUrl = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbolList)}?apikey=${apiKey}`;

      this.logger.debug(`FMP making batch stock request: ${batchUrl}`);
      const response = await fetchWithTimeout(batchUrl, this.timeout);

      this.logger.debug(`FMP batch response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.debug(`FMP batch error: ${response.status} - ${errorText}`);
        return results;
      }

      const data: FMPQuoteResponse[] = await response.json();

      if (Array.isArray(data)) {
        for (const quote of data) {
          if (quote.price && quote.price > 0) {
            let price = quote.price;

            // Convert currency if needed (FMP returns prices in the stock's native currency)
            if (targetCurrency.toUpperCase() !== 'USD') {
              try {
                // Most European stocks are in EUR, USD, or GBP - we'll assume USD for simplicity
                // In a production environment, you'd want to get the actual currency from the exchange
                price = await convertCurrency(price, 'USD', targetCurrency, this.timeout);
              } catch {
                this.logger.warn(
                  `Currency conversion failed for ${quote.symbol}, using original price`,
                );
              }
            }

            results.push({
              symbol: quote.symbol,
              price,
              currency: targetCurrency,
            });

            this.logger.debug(`Successfully fetched stock ${quote.symbol}: $${price}`);
          }
        }
      }
    } catch (error) {
      this.logger.debug(`FMP batch stock request error: ${error.message}`);
    }

    return results;
  }

  private async fetchETFsFromFMP(
    symbols: string[],
    targetCurrency: string,
    apiKey: string,
  ): Promise<AssetResult[]> {
    if (!symbols.length) return [];

    const results: AssetResult[] = [];

    // Try ETF quotes individually as FMP ETF endpoint might be different
    for (const symbol of symbols) {
      try {
        this.fmpRequestCount++;

        // Check daily limit
        if (this.fmpRequestCount > this.fmpApiLimit) {
          this.logger.warn('Financial Modeling Prep daily API limit reached during ETF fetch');
          break;
        }

        // ETF quotes use the same endpoint as stocks
        const etfUrl = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbol)}?apikey=${apiKey}`;

        this.logger.debug(`FMP making ETF request for ${symbol}: ${etfUrl}`);
        const response = await fetchWithTimeout(etfUrl, this.timeout);

        this.logger.debug(
          `FMP ETF response for ${symbol}: ${response.status} ${response.statusText}`,
        );

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.debug(`FMP ETF error for ${symbol}: ${response.status} - ${errorText}`);
          continue;
        }

        const data: FMPQuoteResponse[] = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          const quote = data[0];
          if (quote.price && quote.price > 0) {
            let price = quote.price;

            // Convert currency if needed
            if (targetCurrency.toUpperCase() !== 'USD') {
              try {
                price = await convertCurrency(price, 'USD', targetCurrency, this.timeout);
              } catch {
                this.logger.warn(`Currency conversion failed for ETF ${symbol}, using USD price`);
              }
            }

            results.push({
              symbol: quote.symbol,
              price,
              currency: targetCurrency,
            });

            this.logger.debug(`Successfully fetched ETF ${symbol}: $${price}`);
          }
        } else {
          this.logger.debug(`No ETF data found for ${symbol} in FMP`);
        }
      } catch (error) {
        this.logger.debug(`FMP ETF request error for ${symbol}: ${error.message}`);
        continue;
      }
    }

    return results;
  }

  private async fetchIndicesFromFMP(
    symbols: string[],
    targetCurrency: string,
    apiKey: string,
  ): Promise<AssetResult[]> {
    if (!symbols.length) return [];

    const results: AssetResult[] = [];

    // FMP has specific major indices endpoints for European indices
    const europeanIndices = new Map([
      ['DAX', '^GDAXI'], // German DAX
      ['FTSE', '^FTSE'], // UK FTSE 100
      ['CAC', '^FCHI'], // French CAC 40
      ['IBEX', '^IBEX'], // Spanish IBEX 35
      ['AEX', '^AEX'], // Dutch AEX
      ['SMI', '^SSMI'], // Swiss SMI
      ['STOXX50', '^SX5E'], // Euro Stoxx 50
      ['STOXX600', '^STOXX'], // Euro Stoxx 600
    ]);

    for (const symbol of symbols) {
      try {
        this.fmpRequestCount++;

        // Check daily limit
        if (this.fmpRequestCount > this.fmpApiLimit) {
          this.logger.warn('Financial Modeling Prep daily API limit reached during index fetch');
          break;
        }

        // Try to map to known European index symbols
        const mappedSymbol = europeanIndices.get(symbol.toUpperCase()) || symbol;

        // Use the major indices endpoint for better coverage
        const indexUrl = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(mappedSymbol)}?apikey=${apiKey}`;

        this.logger.debug(`FMP making index request for ${symbol}: ${indexUrl}`);
        const response = await fetchWithTimeout(indexUrl, this.timeout);

        this.logger.debug(
          `FMP index response for ${symbol}: ${response.status} ${response.statusText}`,
        );

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.debug(`FMP index error for ${symbol}: ${response.status} - ${errorText}`);
          continue;
        }

        const data: FMPQuoteResponse[] = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          const quote = data[0];
          if (quote.price && quote.price > 0) {
            let price = quote.price;

            // Convert currency if needed
            if (targetCurrency.toUpperCase() !== 'USD') {
              try {
                price = await convertCurrency(price, 'USD', targetCurrency, this.timeout);
              } catch {
                this.logger.warn(`Currency conversion failed for index ${symbol}, using USD price`);
              }
            }

            results.push({
              symbol: symbol, // Use original symbol, not mapped
              price,
              currency: targetCurrency,
            });

            this.logger.debug(`Successfully fetched index ${symbol}: $${price}`);
          }
        } else {
          this.logger.debug(`No index data found for ${symbol} in FMP`);
        }
      } catch (error) {
        this.logger.debug(`FMP index request error for ${symbol}: ${error.message}`);
        continue;
      }
    }

    return results;
  }
}
