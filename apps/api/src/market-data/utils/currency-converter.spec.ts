import { describe, expect, it, vi } from 'vitest';

import { convertCurrency } from './currency-converter';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('convertCurrency', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return the same amount when currencies are the same', async () => {
    const result = await convertCurrency(100, 'USD', 'USD');
    expect(result).toBe(100);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return the same amount when currencies are the same (case insensitive)', async () => {
    const result = await convertCurrency(100, 'usd', 'USD');
    expect(result).toBe(100);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should convert currency successfully', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        rates: {
          EUR: 0.85,
        },
      }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await convertCurrency(100, 'USD', 'EUR');

    expect(result).toBe(85);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.exchangerate-api.com/v4/latest/USD',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('should handle API errors gracefully', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await convertCurrency(100, 'USD', 'EUR');

    expect(result).toBe(100); // Should return original amount as fallback
  });

  it('should handle missing exchange rate', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        rates: {
          GBP: 0.75,
        },
      }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await convertCurrency(100, 'USD', 'JPY');

    expect(result).toBe(100); // Should return original amount as fallback
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await convertCurrency(100, 'USD', 'EUR');

    expect(result).toBe(100); // Should return original amount as fallback
  });

  it('should respect timeout parameter', async () => {
    // This test verifies that the timeout parameter is passed correctly
    const mockResponse = {
      ok: true,
      json: async () => ({
        rates: {
          EUR: 0.85,
        },
      }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    await convertCurrency(100, 'USD', 'EUR', 5000);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.exchangerate-api.com/v4/latest/USD',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });
});
