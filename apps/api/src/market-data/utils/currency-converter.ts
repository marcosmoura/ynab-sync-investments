import { Logger } from '@nestjs/common';

import { fetchWithTimeout } from './fetch-with-timeout';

type ConversionRateCacheEntry = {
  rates: Record<string, number>;
  timestamp: number;
};

// Simple in-memory cache for conversion rates per fromCurrency
const conversionRateCache: Record<string, ConversionRateCacheEntry> = {};
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Converts an amount from one currency to another using exchangerate-api.com
 * @param amount - The amount to convert
 * @param fromCurrency - The source currency code (e.g., 'USD')
 * @param toCurrency - The target currency code (e.g., 'EUR')
 * @param timeout - Request timeout in milliseconds (default: 10000)
 * @returns The converted amount
 * @throws Error if conversion fails
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  timeout = 10000,
): Promise<number> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) {
    return amount;
  }

  const logger = new Logger('Utils: currencyConverter');
  const cacheKey = from;
  const now = Date.now();
  const cached: ConversionRateCacheEntry = conversionRateCache[cacheKey];

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    const cachedRate = cached.rates[to];

    if (cachedRate) {
      const convertedAmount = amount * cachedRate;

      logger.log(
        `[CACHE] Converted ${amount} ${from} to ${convertedAmount} ${to} (rate: ${cachedRate})`,
      );
      return convertedAmount;
    }
  }

  try {
    // Using exchangerate-api.com free tier (1500 requests/month)
    const url = `https://api.exchangerate-api.com/v4/latest/${from.toUpperCase()}`;
    const request = await fetchWithTimeout(url, timeout);

    if (!request.ok) {
      if (request.status === 404) {
        throw new Error(`Currency not found: ${from} to ${to} - ${url}`);
      }

      throw new Error(`Currency API error: ${request.status} ${request.statusText}`);
    }

    const data = await request.json();

    if (!data.rates || !data.rates[to.toUpperCase()]) {
      throw new Error(`Exchange rate not found for ${from} to ${to}`);
    }

    // Cache all rates for this from
    conversionRateCache[cacheKey] = {
      rates: data.rates,
      timestamp: now,
    };

    const exchangeRate = data.rates[to.toUpperCase()];
    const convertedAmount = amount * exchangeRate;

    logger.log(`Converted ${amount} ${from} to ${convertedAmount} ${to} (rate: ${exchangeRate})`);

    return convertedAmount;
  } catch (error) {
    logger.error(`Failed to convert ${amount} from ${from} to ${to}`, error);
    // Fallback: return original amount with warning
    logger.warn(`Currency conversion failed, returning original amount`);

    return amount;
  }
}
