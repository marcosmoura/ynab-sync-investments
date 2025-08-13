import { Injectable, Logger } from '@nestjs/common';

import { AlphaVantageService } from './providers/alpha-vantage/alpha-vantage.service';
import { CoinMarketCapService } from './providers/coinmarketcap/coinmarketcap.service';
import { FinnhubService } from './providers/finnhub/finnhub.service';
import { PolygonService } from './providers/polygon/polygon.service';
import { RaiffeisenCZService } from './providers/raiffeisen-cz/raiffeisen-cz.service';
import { AssetResult, MarketDataProvider } from './providers/types';
import { YahooFinanceService } from './providers/yahoo-finance/yahoo-finance.service';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly providers: MarketDataProvider[] = [];

  constructor(
    private readonly alphaVantageService: AlphaVantageService,
    private readonly coinMarketCapService: CoinMarketCapService,
    private readonly finnhubService: FinnhubService,
    private readonly polygonService: PolygonService,
    private readonly raiffeisenCZService: RaiffeisenCZService,
    private readonly yahooFinanceService: YahooFinanceService,
  ) {
    // Filter and order providers by availability
    const allProviders = [
      this.finnhubService,
      this.yahooFinanceService,
      this.raiffeisenCZService,
      this.alphaVantageService,
      this.polygonService,
      this.coinMarketCapService,
    ];

    this.providers = allProviders.filter((provider) => {
      const isAvailable = provider.isAvailable();
      this.logger.debug(`Provider ${provider.getProviderName()}: isAvailable = ${isAvailable}`);
      return isAvailable;
    });

    this.logger.log(
      `Initialized MarketDataService with ${this.providers.length} available providers: [${this.providers
        .map((p) => p.getProviderName())
        .join(', ')}]`,
    );
  }

  async getAssetPrices(
    symbols: string[],
    targetCurrency = 'USD',
    logNotFound = false,
  ): Promise<AssetResult[]> {
    if (!symbols.length) return [];

    // Only log basic info if we're not doing detailed logging
    if (!logNotFound) {
      this.logger.log(`Fetching prices for symbols: [${symbols.join(', ')}] in ${targetCurrency}`);
    }

    const results: AssetResult[] = [];
    const remainingSymbols = [...symbols];
    const providerCounts = new Map<string, number>();

    // Try each provider in order until all symbols are found or providers are exhausted
    for (const provider of this.providers) {
      if (remainingSymbols.length === 0) break;

      try {
        this.logger.debug(`Using ${targetCurrency} as target currency`);
        this.logger.debug(
          `Trying ${provider.getProviderName()} for symbols: [${remainingSymbols.join(', ')}]`,
        );

        const providerResults = await provider.fetchAssetPrices(remainingSymbols, targetCurrency);
        results.push(...providerResults);

        // Track provider results count
        const providerName = provider.getProviderName();
        providerCounts.set(providerName, providerResults.length);

        // Log detailed provider results if detailed logging is enabled
        if (logNotFound) {
          this.logger.log(`${providerName} found ${providerResults.length} assets`);
        }

        // Remove found symbols from remaining list
        providerResults.forEach((result) => {
          const index = remainingSymbols.findIndex(
            (s) => s.toUpperCase() === result.symbol.toUpperCase(),
          );
          if (index !== -1) {
            remainingSymbols.splice(index, 1);
          }
        });

        this.logger.debug(
          `${provider.getProviderName()} found ${providerResults.length} results, ${remainingSymbols.length} symbols remaining`,
        );
      } catch (error) {
        this.logger.error(`${provider.getProviderName()} batch request failed: ${error.message}`);
        continue; // Try next provider
      }
    }

    if (logNotFound && remainingSymbols.length > 0) {
      this.logger.warn(`Assets not found in any provider: [${remainingSymbols.join(', ')}]`);
    }

    // Log detailed summary if detailed logging is enabled
    if (logNotFound) {
      this.logger.log(
        `Asset price fetch complete: ${results.length}/${symbols.length} assets found`,
      );

      const breakdown = Array.from(providerCounts.entries())
        .filter(([, count]) => count > 0)
        .map(([provider, count]) => `${provider}: ${count}`)
        .join(', ');

      if (breakdown) {
        this.logger.log(`Provider breakdown: ${breakdown}`);
      }
    } else {
      // Only log basic success message if not detailed logging
      this.logger.log(`Successfully fetched ${results.length} asset prices`);
    }

    return results;
  }

  getAvailableProviders(): string[] {
    return this.providers.map((provider) => provider.getProviderName());
  }
}
