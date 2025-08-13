import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

import { FinnhubService } from './finnhub.service';

describe('FinnhubService', () => {
  let service: FinnhubService;
  const originalEnv = process.env;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FinnhubService],
    }).compile();

    service = module.get<FinnhubService>(FinnhubService);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('getProviderName', () => {
    it('should return Finnhub', () => {
      expect(service.getProviderName()).toBe('Finnhub');
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is available', () => {
      process.env.FINNHUB_API_KEY = 'test-key';
      expect(service.isAvailable()).toBe(true);
    });

    it('should return false when API key is not available', () => {
      delete process.env.FINNHUB_API_KEY;
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('fetchAssetPrices', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
      process.env.FINNHUB_API_KEY = 'test-key';
    });

    it('should return empty array for empty symbols', async () => {
      const result = await service.fetchAssetPrices([], 'USD');
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error when API key is not configured', async () => {
      delete process.env.FINNHUB_API_KEY;
      await expect(service.fetchAssetPrices(['AAPL'], 'USD')).rejects.toThrow(
        'Finnhub API key not configured',
      );
    });

    it('should fetch asset prices successfully', async () => {
      const mockResponse = {
        c: 150.25, // current price
        d: 2.5, // change
        dp: 1.69, // percent change
        h: 151.0, // high
        l: 148.0, // low
        o: 149.0, // open
        pc: 147.75, // previous close
        t: Date.now(), // timestamp
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.fetchAssetPrices(['AAPL'], 'USD');

      expect(result).toEqual([
        {
          symbol: 'AAPL',
          price: 150.25,
          currency: 'USD',
        },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://finnhub.io/api/v1/quote?symbol=AAPL&token=test-key',
        {
          signal: expect.any(AbortSignal),
        },
      );
    });

    it('should handle multiple symbols', async () => {
      // Mock fetch for each symbol
      mockFetch.mockImplementation((url) => {
        if (url.includes('AAPL')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ c: 150.25 }),
          });
        }
        if (url.includes('GOOGL')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ c: 3200.5 }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });
      const result = await service.fetchAssetPrices(['AAPL', 'GOOGL'], 'USD');
      expect(result).toEqual([
        { symbol: 'AAPL', price: 150.25, currency: 'USD' },
        { symbol: 'GOOGL', price: 3200.5, currency: 'USD' },
      ]);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('INVALID')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            text: () => Promise.resolve('Symbol not found'),
          });
        }
        if (url.includes('AAPL')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ c: 150.25 }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });
      const result = await service.fetchAssetPrices(['INVALID', 'AAPL'], 'USD');
      expect(result).toEqual([{ symbol: 'AAPL', price: 150.25, currency: 'USD' }]);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('NETWORK_ERROR')) {
          return Promise.reject(new Error('Network error'));
        }
        if (url.includes('AAPL')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ c: 150.25 }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });
      const result = await service.fetchAssetPrices(['NETWORK_ERROR', 'AAPL'], 'USD');
      expect(result).toEqual([{ symbol: 'AAPL', price: 150.25, currency: 'USD' }]);
    });

    it('should skip symbols with invalid price data', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('INVALID_PRICE')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ c: 0 }) });
        }
        if (url.includes('AAPL')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ c: 150.25 }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });
      const result = await service.fetchAssetPrices(['INVALID_PRICE', 'AAPL'], 'USD');
      expect(result).toEqual([{ symbol: 'AAPL', price: 150.25, currency: 'USD' }]);
    });

    it('should handle missing price data gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}), // Empty response
      });

      const result = await service.fetchAssetPrices(['NO_DATA'], 'USD');

      expect(result).toEqual([]);
    });

    it('should handle timeout gracefully', async () => {
      // Mock AbortController to simulate timeout
      const mockAbortController = {
        signal: { aborted: false } as AbortSignal,
        abort: vi.fn(),
      };
      vi.spyOn(global, 'AbortController').mockReturnValue(
        mockAbortController as unknown as AbortController,
      );

      // Mock fetch to reject with AbortError after a delay
      mockFetch.mockImplementation(() => {
        // Simulate timeout by rejecting with AbortError
        return Promise.reject(new Error('AbortError'));
      });

      const result = await service.fetchAssetPrices(['TIMEOUT_TEST'], 'USD');

      expect(result).toEqual([]);
    }, 15000); // Set test timeout to 15 seconds
  });
});
