import { Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

import { convertCurrency } from '../../utils/currency-converter';
import { AssetResult, MarketDataProvider } from '../types';

export class RaiffeisenCZService implements MarketDataProvider {
  private readonly logger = new Logger(RaiffeisenCZService.name);
  private readonly timeout = 10000;

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
      } catch (error) {
        this.logger.error(`Error fetching asset price for ${symbol}: ${error.message}`);
      }
    }

    return results;
  }

  private async getInformationFromRaiffeisenPage(config: {
    priceTextSelector: string;
    priceSiblingSelector: string;
    currencyTextSelector: string;
    currencySiblingSelector: string;
    targetCurrency: string;
    page: string;
  }): Promise<number | null> {
    const {
      page,
      priceTextSelector,
      priceSiblingSelector,
      currencyTextSelector,
      currencySiblingSelector,
      targetCurrency,
    } = config;

    const $ = cheerio.load(page);

    const priceElement = $(priceTextSelector).next(priceSiblingSelector);
    const priceTextRaw = priceElement.text();

    const currencyText = $(currencyTextSelector).next(currencySiblingSelector);
    const currency = currencyText.text() || targetCurrency;

    const price = parseFloat(priceTextRaw.replace(',', '.'));

    let convertedPrice = price;
    if (price && !isNaN(price) && currency && targetCurrency && currency !== targetCurrency) {
      convertedPrice = await convertCurrency(price, currency, targetCurrency, this.timeout);
    }

    return isNaN(convertedPrice) ? null : convertedPrice;
  }

  private async fetchRaiffeisenPage(baseUrl: string, symbol: string): Promise<string | null> {
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
    const page = await this.fetchRaiffeisenPage('https://investice.rb.cz/en/produkt/stock', symbol);

    return this.getInformationFromRaiffeisenPage({
      page,
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
    const page = await this.fetchRaiffeisenPage('https://investice.rb.cz/en/produkt/fund', symbol);

    return this.getInformationFromRaiffeisenPage({
      page,
      priceTextSelector: '.top-info-label:contains("Price")',
      priceSiblingSelector: '.top-info-value',
      currencyTextSelector: '.top-info-label:contains("Currency")',
      currencySiblingSelector: '.top-info-value',
      targetCurrency,
    });
  }
}
