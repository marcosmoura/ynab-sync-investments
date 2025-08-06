import { Logger } from '@nestjs/common';

import { fetchWithTimeout } from './fetch-with-timeout';

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
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return amount;
  }

  const logger = new Logger('Utils: currencyConverter');

  try {
    // Using exchangerate-api.com free tier (1500 requests/month)
    const url = `https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`;

    const response = await fetchWithTimeout(url, timeout);

    if (!response.ok) {
      throw new Error(`Currency API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.rates || !data.rates[toCurrency.toUpperCase()]) {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    const exchangeRate = data.rates[toCurrency.toUpperCase()];
    const convertedAmount = amount * exchangeRate;

    logger.log(
      `Converted ${amount} ${fromCurrency} to ${convertedAmount} ${toCurrency} (rate: ${exchangeRate})`,
    );

    return convertedAmount;
  } catch (error) {
    logger.error(`Failed to convert ${amount} from ${fromCurrency} to ${toCurrency}`, error);

    // Fallback: return original amount with warning
    logger.warn(`Currency conversion failed, returning original amount`);
    return amount;
  }
}
