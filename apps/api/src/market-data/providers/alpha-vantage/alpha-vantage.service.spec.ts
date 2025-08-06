import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

import { AlphaVantageService } from './alpha-vantage.service';

describe('AlphaVantageService', () => {
  let service: AlphaVantageService;
  const originalEnv = process.env;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlphaVantageService],
    }).compile();

    service = module.get<AlphaVantageService>(AlphaVantageService);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('getProviderName', () => {
    it('should return Alpha Vantage', () => {
      expect(service.getProviderName()).toBe('Alpha Vantage');
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is available', () => {
      process.env.ALPHA_VANTAGE_API_KEY = 'test-key';
      expect(service.isAvailable()).toBe(true);
    });

    it('should return false when API key is not available', () => {
      delete process.env.ALPHA_VANTAGE_API_KEY;
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('fetchAssetPrices', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
      process.env.ALPHA_VANTAGE_API_KEY = 'test-key';
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return empty array for empty symbols', async () => {
      const result = await service.fetchAssetPrices([], 'USD');
      expect(result).toEqual([]);
    });

    it('should successfully fetch asset prices', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '02. open': '150.00',
            '03. high': '155.00',
            '04. low': '148.00',
            '05. price': '152.50',
            '06. volume': '1000000',
            '07. latest trading day': '2023-01-01',
            '08. previous close': '151.00',
            '09. change': '1.50',
            '10. change percent': '0.99%',
          },
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.fetchAssetPrices(['AAPL'], 'USD');

      expect(result).toEqual([
        {
          symbol: 'AAPL',
          price: 152.5,
          currency: 'USD',
        },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=test-key',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should handle multiple symbols with delay', async () => {
      const mockResponse1 = {
        ok: true,
        json: async () => ({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '02. open': '150.00',
            '03. high': '155.00',
            '04. low': '148.00',
            '05. price': '152.50',
            '06. volume': '1000000',
            '07. latest trading day': '2023-01-01',
            '08. previous close': '151.00',
            '09. change': '1.50',
            '10. change percent': '0.99%',
          },
        }),
      };

      const mockResponse2 = {
        ok: true,
        json: async () => ({
          'Global Quote': {
            '01. symbol': 'GOOGL',
            '02. open': '2800.00',
            '03. high': '2850.00',
            '04. low': '2780.00',
            '05. price': '2825.50',
            '06. volume': '500000',
            '07. latest trading day': '2023-01-01',
            '08. previous close': '2810.00',
            '09. change': '15.50',
            '10. change percent': '0.55%',
          },
        }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      // Start the async operation
      const resultPromise = service.fetchAssetPrices(['AAPL', 'GOOGL'], 'USD');

      // Fast-forward time to simulate delay
      await vi.advanceTimersByTimeAsync(12000);

      const result = await resultPromise;

      expect(result).toEqual([
        {
          symbol: 'AAPL',
          price: 152.5,
          currency: 'USD',
        },
        {
          symbol: 'GOOGL',
          price: 2825.5,
          currency: 'USD',
        },
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle error messages', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          'Error Message': 'Invalid API call',
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.fetchAssetPrices(['INVALID'], 'USD');

      expect(result).toEqual([]);
    });

    it('should handle rate limit notes', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          Note: 'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute.',
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.fetchAssetPrices(['AAPL', 'GOOGL'], 'USD');

      // Should stop processing after hitting rate limit
      expect(result).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error when API key is not configured', async () => {
      delete process.env.ALPHA_VANTAGE_API_KEY;

      await expect(service.fetchAssetPrices(['AAPL'], 'USD')).rejects.toThrow(
        'Alpha Vantage API key not configured',
      );
    });

    it('should handle API error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key',
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.fetchAssetPrices(['AAPL'], 'USD');

      // Should return empty array and continue with other symbols
      expect(result).toEqual([]);
    });

    it('should handle currency conversion', async () => {
      const mockStockResponse = {
        ok: true,
        json: async () => ({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '02. open': '150.00',
            '03. high': '155.00',
            '04. low': '148.00',
            '05. price': '100.00',
            '06. volume': '1000000',
            '07. latest trading day': '2023-01-01',
            '08. previous close': '151.00',
            '09. change': '1.50',
            '10. change percent': '0.99%',
          },
        }),
      };

      const mockCurrencyResponse = {
        ok: true,
        json: async () => ({
          rates: {
            EUR: 0.85,
          },
        }),
      };

      mockFetch
        .mockResolvedValueOnce(mockStockResponse)
        .mockResolvedValueOnce(mockCurrencyResponse);

      const result = await service.fetchAssetPrices(['AAPL'], 'EUR');

      expect(result).toEqual([
        {
          symbol: 'AAPL',
          price: 85.0, // 100 * 0.85
          currency: 'EUR',
        },
      ]);
    });

    it('should handle fetch timeout', async () => {
      // Mock fetch to reject immediately with a timeout error
      mockFetch.mockRejectedValue(new Error('The operation was aborted'));

      const result = await service.fetchAssetPrices(['AAPL'], 'USD');

      // Should return empty array when requests fail
      expect(result).toEqual([]);
    });
  });
});
