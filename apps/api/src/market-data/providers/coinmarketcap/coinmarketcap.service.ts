import { Injectable, Logger } from '@nestjs/common';

import { fetchWithTimeout } from '../../utils';
import { AssetResult, MarketDataProvider } from '../types';

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

@Injectable()
export class CoinMarketCapService implements MarketDataProvider {
  private readonly logger = new Logger(CoinMarketCapService.name);
  private readonly timeout = 10000;

  getProviderName(): string {
    return 'CoinMarketCap';
  }

  isAvailable(): boolean {
    return !!process.env.COINMARKETCAP_API_KEY;
  }

  async fetchAssetPrices(symbols: string[], targetCurrency: string): Promise<AssetResult[]> {
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
      const response = await fetchWithTimeout(url, this.timeout, {
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

      const found = results.map((r) => r.symbol).join(', ');
      const foundSymbols = found ? `[${found}]` : 'none';

      this.logger.debug(
        `CoinMarketCap found ${results.length} results for symbols [${symbolsParam}]: ${foundSymbols}`,
      );

      return results;
    } catch (error) {
      this.logger.error(
        `CoinMarketCap request failed for symbols [${symbolsParam}]: ${error.message}`,
      );
      throw error;
    }
  }
}
