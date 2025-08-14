import { Logger } from '@nestjs/common';
import accounting from 'accounting';
import * as cheerio from 'cheerio';

import { convertCurrency } from '../../utils/currency-converter';
import { AssetResult, MarketDataProvider } from '../types';

type CheerioPage = ReturnType<typeof cheerio.load>;

export class RaiffeisenCZService implements MarketDataProvider {
  private readonly logger = new Logger(RaiffeisenCZService.name);
  private readonly timeout = 10000;
  private loadedPages: Map<string, CheerioPage> = new Map();

  getProviderName(): string {
    return 'Raiffeisen CZ';
  }

  isAvailable(): boolean {
    // Raiffeisen CZ is always available
    return true;
  }

  isValidPrice(price: number | null): boolean {
    return price !== null && !isNaN(price) && price > 0;
  }

  /**
   * Fetches the price of an asset from Raiffeisen's investment page by ISIN code.
   * @param symbol ISIN code of the asset
   * @returns The price as a number, or null if not found
   */
  async fetchAssetPrices(symbols: string[], targetCurrency = 'USD'): Promise<AssetResult[]> {
    const results: AssetResult[] = [];

    for (const symbol of symbols) {
      try {
        const stockPrice = await this.getRaiffeisenStockPrice(symbol, targetCurrency);

        if (this.isValidPrice(stockPrice)) {
          results.push({
            symbol,
            price: stockPrice,
            currency: targetCurrency,
          });
          continue;
        }

        const fundPrice = await this.getRaiffeisenFundPrice(symbol, targetCurrency);

        if (this.isValidPrice(fundPrice)) {
          results.push({
            symbol,
            price: fundPrice,
            currency: targetCurrency,
          });
          continue;
        }

        const certificateRcbPrice = await this.getRaiffeisenCertificateRcbPrice(
          symbol,
          targetCurrency,
        );

        if (this.isValidPrice(certificateRcbPrice)) {
          results.push({
            symbol,
            price: certificateRcbPrice,
            currency: targetCurrency,
          });
          continue;
        }

        this.logger.warn(`No valid price found for ${symbol} in Raiffeisen CZ`);
      } catch (error) {
        this.logger.error(`Error fetching asset price for ${symbol}: ${error.message}`);
      }
    }

    return results;
  }

  private loadPage(page: string): CheerioPage {
    if (this.loadedPages.has(page)) {
      return this.loadedPages.get(page);
    }

    const $ = cheerio.load(page);

    this.loadedPages.set(page, $);

    return $;
  }

  private getPageText(config: {
    referenceTextSelector: string;
    referenceSiblingSelector: string;
    page: CheerioPage;
  }): string {
    const { page, referenceTextSelector, referenceSiblingSelector } = config;

    return page(referenceTextSelector).next(referenceSiblingSelector).text();
  }

  private async getPriceFromRaiffeisenPage(config: {
    priceTextSelector: string;
    priceSiblingSelector: string;
    currencyTextSelector: string;
    currencySiblingSelector: string;
    targetCurrency: string;
    html: string;
  }): Promise<number | null> {
    const {
      html,
      priceTextSelector,
      priceSiblingSelector,
      currencyTextSelector,
      currencySiblingSelector,
      targetCurrency,
    } = config;

    const $ = this.loadPage(html);

    const priceTextRaw = this.getPageText({
      page: $,
      referenceTextSelector: priceTextSelector,
      referenceSiblingSelector: priceSiblingSelector,
    });

    const currencyTextRaw = this.getPageText({
      page: $,
      referenceTextSelector: currencyTextSelector,
      referenceSiblingSelector: currencySiblingSelector,
    });

    const currency = currencyTextRaw || targetCurrency;
    const price = accounting.unformat(priceTextRaw);

    let convertedPrice = price;
    if (price && !isNaN(price) && currency && targetCurrency && currency !== targetCurrency) {
      convertedPrice = await convertCurrency(price, currency, targetCurrency, this.timeout);
    }

    return isNaN(convertedPrice) ? null : convertedPrice;
  }

  private async fetchRaiffeisenPageHTML(baseUrl: string, symbol: string): Promise<string | null> {
    try {
      const url = `${baseUrl}/?ISIN=${encodeURIComponent(symbol)}`;
      const response = await fetch(url);

      if (!response.ok) {
        this.logger.error(`Failed to fetch fund price for ${symbol}: ${response.status}`);
        return null;
      }

      const html = await response.text();

      return html;
    } catch (error) {
      this.logger.error(`Failed to fetch fund price for ${symbol}: ${error.message}`);
      return null;
    }
  }

  private async getRaiffeisenStockPrice(
    symbol: string,
    targetCurrency: string,
  ): Promise<number | null> {
    const html = await this.fetchRaiffeisenPageHTML(
      'https://investice.rb.cz/en/produkt/stock',
      symbol,
    );

    return this.getPriceFromRaiffeisenPage({
      html,
      priceTextSelector: '.striped-list-label:contains("Quote")',
      priceSiblingSelector: '.striped-list-value',
      currencyTextSelector: '.striped-list-label:contains("Currency")',
      currencySiblingSelector: '.striped-list-value',
      targetCurrency,
    });
  }

  private async getRaiffeisenFundPrice(
    symbol: string,
    targetCurrency: string,
  ): Promise<number | null> {
    const html = await this.fetchRaiffeisenPageHTML(
      'https://investice.rb.cz/en/produkt/fund',
      symbol,
    );

    return this.getPriceFromRaiffeisenPage({
      html,
      priceTextSelector: '.top-info-label:contains("Price")',
      priceSiblingSelector: '.top-info-value',
      currencyTextSelector: '.top-info-label:contains("Currency")',
      currencySiblingSelector: '.top-info-value',
      targetCurrency,
    });
  }

  private async getRaiffeisenCertificateRcbPrice(
    symbol: string,
    targetCurrency: string,
  ): Promise<number | null> {
    const html = await this.fetchRaiffeisenPageHTML(
      'https://investice.rb.cz/en/produkt/certificate-rcb',
      symbol,
    );

    const price = await this.getPriceFromRaiffeisenPage({
      html,
      priceTextSelector: '.striped-list-label:contains("Denomination / nominal")',
      priceSiblingSelector: '.striped-list-value',
      currencyTextSelector: '.striped-list-label:contains("Product currency")',
      currencySiblingSelector: '.striped-list-value',
      targetCurrency,
    });

    const bid = this.getPageText({
      page: this.loadPage(html),
      referenceTextSelector: '.top-info-label:contains("Bid")',
      referenceSiblingSelector: '.top-info-value',
    });

    if (!price || !bid) {
      this.logger.error(`Failed to extract price or bid for ${symbol}`);
      return null;
    }

    return (price * parseFloat(bid)) / 100;
  }
}
