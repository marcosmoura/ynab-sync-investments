import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { convertCurrency } from './currency-converter';
import * as fetchWithTimeoutModule from './fetch-with-timeout';

// Mock the fetchWithTimeout module
vi.mock('./fetch-with-timeout');
// Mock the Logger class
vi.mock('@nestjs/common', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

const mockFetchWithTimeout = vi.mocked(fetchWithTimeoutModule.fetchWithTimeout);

// Exchange rates API response type
interface ExchangeRateResponse {
  rates: Record<string, number>;
}

describe('convertCurrency', () => {
  // Helper function to create mock Response
  const createMockResponse = (
    data: Partial<ExchangeRateResponse> | null,
    ok = true,
    status = 200,
    statusText = 'OK',
  ): Response => {
    return {
      ok,
      status,
      statusText,
      json: vi.fn().mockResolvedValue(data),
    } as unknown as Response;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear any timers between tests
    vi.clearAllTimers();
  });

  describe('same currency conversion', () => {
    it('should return the original amount when from and to currencies are the same', async () => {
      const result = await convertCurrency(100, 'USD', 'USD');
      expect(result).toBe(100);
      expect(mockFetchWithTimeout).not.toHaveBeenCalled();
    });

    it('should handle case insensitive currency codes', async () => {
      const result = await convertCurrency(50, 'usd', 'USD');
      expect(result).toBe(50);
      expect(mockFetchWithTimeout).not.toHaveBeenCalled();
    });
  });

  describe('successful API conversion', () => {
    it('should convert currency successfully with valid API response', async () => {
      const mockResponse = createMockResponse({
        rates: {
          EUR: 0.85,
          GBP: 0.73,
        },
      });
      mockFetchWithTimeout.mockResolvedValue(mockResponse);

      const result = await convertCurrency(100, 'CAD', 'EUR');

      expect(result).toBe(85); // 100 * 0.85
      expect(mockFetchWithTimeout).toHaveBeenCalledWith(
        'https://api.exchangerate-api.com/v4/latest/CAD',
        10000,
      );
    });

    it('should use custom timeout when provided', async () => {
      const mockResponse = createMockResponse({
        rates: { SGD: 1.35 },
      });
      mockFetchWithTimeout.mockResolvedValue(mockResponse);

      await convertCurrency(100, 'NZD', 'SGD', 5000);

      expect(mockFetchWithTimeout).toHaveBeenCalledWith(
        'https://api.exchangerate-api.com/v4/latest/NZD',
        5000,
      );
    });

    it('should handle uppercase currency conversion correctly', async () => {
      const mockResponse = createMockResponse({
        rates: { CHF: 0.92 },
      });
      mockFetchWithTimeout.mockResolvedValue(mockResponse);

      const result = await convertCurrency(100, 'aud', 'chf');

      expect(result).toBe(92);
      expect(mockFetchWithTimeout).toHaveBeenCalledWith(
        'https://api.exchangerate-api.com/v4/latest/AUD',
        10000,
      );
    });
  });

  describe('error handling', () => {
    it('should handle 404 currency not found error', async () => {
      const mockResponse = createMockResponse(null, false, 404, 'Not Found');
      mockFetchWithTimeout.mockResolvedValue(mockResponse);

      const result = await convertCurrency(100, 'INVALID', 'GBP');

      expect(result).toBe(100); // Fallback to original amount
    });

    it('should handle general API errors', async () => {
      const mockResponse = createMockResponse(null, false, 500, 'Internal Server Error');
      mockFetchWithTimeout.mockResolvedValue(mockResponse);

      const result = await convertCurrency(100, 'SEK', 'NOK');

      expect(result).toBe(100); // Fallback to original amount
    });

    it('should handle missing exchange rate in response', async () => {
      const mockResponse = createMockResponse({
        rates: {
          GBP: 0.73,
          // SEK is missing
        },
      });
      mockFetchWithTimeout.mockResolvedValue(mockResponse);

      const result = await convertCurrency(100, 'JPY', 'SEK');

      expect(result).toBe(100); // Fallback to original amount
    });

    it('should handle malformed API response', async () => {
      const mockResponse = createMockResponse({
        // Missing rates property
      } as Partial<ExchangeRateResponse>);
      mockFetchWithTimeout.mockResolvedValue(mockResponse);

      const result = await convertCurrency(100, 'CNY', 'KRW');

      expect(result).toBe(100); // Fallback to original amount
    });

    it('should handle network/fetch errors', async () => {
      mockFetchWithTimeout.mockRejectedValue(new Error('Network error'));

      const result = await convertCurrency(100, 'THB', 'VND');

      expect(result).toBe(100); // Fallback to original amount
    });

    it('should handle JSON parsing errors', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as Response;
      mockFetchWithTimeout.mockResolvedValue(mockResponse);

      const result = await convertCurrency(100, 'INR', 'PHP');

      expect(result).toBe(100); // Fallback to original amount
    });
  });

  describe('edge cases', () => {
    it('should handle zero amount conversion', async () => {
      const result = await convertCurrency(0, 'USD', 'USD');
      expect(result).toBe(0);
    });

    it('should handle negative amounts', async () => {
      const mockResponse = createMockResponse({
        rates: { MXN: 18.5 },
      });
      mockFetchWithTimeout.mockResolvedValue(mockResponse);

      const result = await convertCurrency(-100, 'BRL', 'MXN');
      expect(result).toBe(-1850); // -100 * 18.5
    });

    it('should handle decimal amounts', async () => {
      const mockResponse = createMockResponse({
        rates: { ZAR: 15.2 },
      });
      mockFetchWithTimeout.mockResolvedValue(mockResponse);

      const result = await convertCurrency(100.5, 'HKD', 'ZAR');
      expect(result).toBe(1527.6); // 100.50 * 15.2
    });
  });
});
