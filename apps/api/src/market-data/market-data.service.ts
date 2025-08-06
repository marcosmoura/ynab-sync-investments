import { Injectable, Logger } from '@nestjs/common';

import { AssetPriceResponseDto } from './dto';

interface CoinMarketCapResponse {
  data: {
    [symbol: string]: Array<{
      id: number;
      name: string;
      symbol: string;
      slug: string;
      is_active: number;
      quote: {
        [currency: string]: {
          price: number;
          volume_24h: number;
          percent_change_1h: number;
          percent_change_24h: number;
          percent_change_7d: number;
          market_cap: number;
          last_updated: string;
        };
      };
    }>;
  };
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
    elapsed: number;
    credit_count: number;
  };
}

interface AssetResult {
  symbol: string;
  price: number;
  currency: string;
}

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly timeout = 10000;
  private readonly polygonApiLimit = 5; // Free tier limit per minute
  private polygonRequestCount = 0;
  private lastPolygonResetTime = Date.now();

  async getAssetPrice(
    symbol: string,
    targetCurrency = 'USD',
  ): Promise<Omit<AssetPriceResponseDto, 'timestamp'>> {
    const results = await this.getAssetPrices([symbol], targetCurrency, false); // Don't log for single asset requests

    if (results.length === 0) {
      throw new Error(`Failed to fetch price for ${symbol}: Unable to find asset in any provider`);
    }

    return results[0];
  }

  async getAssetPrices(
    symbols: string[],
    targetCurrency = 'USD',
    shouldLog = true,
  ): Promise<Array<Omit<AssetPriceResponseDto, 'timestamp'>>> {
    const results: Array<Omit<AssetPriceResponseDto, 'timestamp'>> = [];
    const remainingSymbols = [...symbols];
    const foundAssets: { [provider: string]: string[] } = {
      CoinMarketCap: [],
      'Polygon.io': [],
    };

    // Check if we have API keys available
    const hasCoinMarketCapKey = !!process.env.COINMARKETCAP_API_KEY;
    const hasPolygonKey = !!process.env.POLYGON_API_KEY;

    // Step 1: Try CoinMarketCap first (if API key available)
    if (hasCoinMarketCapKey) {
      try {
        const cryptoResults = await this.fetchFromCoinMarketCap(remainingSymbols, targetCurrency);
        results.push(...cryptoResults);

        // Track found assets and remove successfully fetched symbols
        cryptoResults.forEach((result) => {
          foundAssets['CoinMarketCap'].push(result.symbol);
          const index = remainingSymbols.findIndex(
            (s) => s.toUpperCase() === result.symbol.toUpperCase(),
          );
          if (index !== -1) {
            remainingSymbols.splice(index, 1);
          }
        });

        if (shouldLog) {
          this.logger.log(`CoinMarketCap found ${cryptoResults.length} assets`);
        }
      } catch (error) {
        this.logger.error(`CoinMarketCap batch request failed: ${error.message}`);
        // Don't throw, continue with other providers
      }
    } else if (remainingSymbols.length > 0 && !hasCoinMarketCapKey) {
      this.logger.debug('CoinMarketCap API key not available, skipping');
    }

    // Step 2: Try Polygon.io for remaining symbols (if API key available)
    if (remainingSymbols.length > 0 && hasPolygonKey) {
      try {
        const polygonResults = await this.fetchFromPolygon(remainingSymbols, targetCurrency);
        results.push(...polygonResults);

        // Track found assets
        polygonResults.forEach((result) => {
          foundAssets['Polygon.io'].push(result.symbol);
        });

        if (shouldLog) {
          this.logger.log(`Polygon.io found ${polygonResults.length} assets`);
        }
      } catch (error) {
        this.logger.debug(`Polygon.io batch request failed: ${error.message}`);
      }
    }

    // Log summary of the process
    if (shouldLog) {
      const totalFound = results.length;
      const totalRequested = symbols.length;
      const notFoundSymbols = symbols.filter(
        (symbol) => !results.some((result) => result.symbol.toUpperCase() === symbol.toUpperCase()),
      );

      this.logger.log(`Asset price fetch complete: ${totalFound}/${totalRequested} assets found`);

      if (notFoundSymbols.length > 0) {
        this.logger.warn(`Assets not found in any provider: [${notFoundSymbols.join(', ')}]`);
      }

      // Log breakdown by provider
      const providerSummary = Object.entries(foundAssets)
        .filter(([, assets]) => assets.length > 0)
        .map(([provider, assets]) => `${provider}: ${assets.length}`)
        .join(', ');

      if (providerSummary) {
        this.logger.log(`Provider breakdown: ${providerSummary}`);
      }
    }

    return results;
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

  private async fetchFromCoinMarketCap(
    symbols: string[],
    targetCurrency: string,
  ): Promise<AssetResult[]> {
    if (!symbols.length) return [];

    // Filter out symbols with special characters (CoinMarketCap only accepts alphanumeric symbols)
    const validSymbols = symbols.filter((symbol) => /^[A-Za-z0-9]+$/.test(symbol));
    const invalidSymbols = symbols.filter((symbol) => !/^[A-Za-z0-9]+$/.test(symbol));

    if (invalidSymbols.length > 0) {
      this.logger.debug(
        `CoinMarketCap: Skipping symbols with special characters: [${invalidSymbols.join(', ')}]`,
      );
    }

    if (!validSymbols.length) {
      this.logger.debug(
        'CoinMarketCap: No valid symbols to fetch (all contain special characters)',
      );
      return [];
    }

    this.logger.log(
      `======= CoinMarketCap fetching prices for symbols: [${validSymbols.join(', ')}] =======`,
    );

    const apiKey = process.env.COINMARKETCAP_API_KEY;
    if (!apiKey) {
      throw new Error('CoinMarketCap API key not configured');
    }

    const currency = targetCurrency.toUpperCase();
    const symbolsParam = validSymbols.join(',');

    // Use v2 endpoint with symbol parameter
    const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${symbolsParam}&convert=${currency}`;

    try {
      const response = await this.fetchWithTimeout(url, {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `CoinMarketCap API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const { data }: CoinMarketCapResponse = await response.json();
      const results: AssetResult[] = [];

      // Handle v2 response format where data contains arrays of assets
      if (data) {
        for (const [_symbol, assetDataArray] of Object.entries(data)) {
          // v2 API returns arrays of assets for each symbol
          if (Array.isArray(assetDataArray) && assetDataArray.length > 0) {
            const assetData = assetDataArray[0]; // Take the first (primary) asset

            // Check if the asset is active (is_active = 1)
            if (
              assetData &&
              assetData.is_active === 1 &&
              assetData.quote &&
              assetData.quote[currency]
            ) {
              results.push({
                symbol: assetData.symbol,
                price: assetData.quote[currency].price,
                currency: targetCurrency,
              });
            } else if (assetData && assetData.is_active === 0) {
              this.logger.debug(
                `CoinMarketCap asset ${assetData.symbol} is inactive, will try other providers`,
              );
            }
          }
        }
      }

      this.logger.debug(
        `CoinMarketCap found ${results.length} results for symbols [${symbolsParam}]`,
      );
      return results;
    } catch (error) {
      this.logger.error(
        `CoinMarketCap request failed for symbols [${symbolsParam}]: ${error.message}`,
      );
      throw error;
    }
  }

  private async fetchFromPolygon(
    symbols: string[],
    targetCurrency: string,
  ): Promise<AssetResult[]> {
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

    if (results.length === 0) {
      throw new Error('No data found in Polygon.io for any of the requested symbols');
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

    // Get the most recent trading day (handle weekends and holidays)
    const today = new Date();
    const tradingDay = new Date(today);

    // Go back up to 7 days to find a trading day
    for (let i = 1; i <= 7; i++) {
      tradingDay.setDate(today.getDate() - i);
      const dayOfWeek = tradingDay.getDay();

      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        break;
      }
    }

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
        const stockUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${apiKey}`;

        this.logger.debug(`Polygon.io making request for ${symbol}: ${stockUrl}`);
        const response = await this.fetchWithTimeout(stockUrl);

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
              price = await this.convertCurrency(price, 'USD', targetCurrency);
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
        const indexUrl = `https://api.polygon.io/v2/aggs/ticker/I:${symbol}/prev?adjusted=true&apikey=${apiKey}`;

        this.logger.debug(`Polygon.io making index request for ${symbol}: ${indexUrl}`);
        const response = await this.fetchWithTimeout(indexUrl);

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
              price = await this.convertCurrency(price, 'USD', targetCurrency);
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
