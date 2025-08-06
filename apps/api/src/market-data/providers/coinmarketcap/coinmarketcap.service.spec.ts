import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

import { CoinMarketCapService } from './coinmarketcap.service';

describe('CoinMarketCapService', () => {
  let service: CoinMarketCapService;
  const originalEnv = process.env;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoinMarketCapService],
    }).compile();

    service = module.get<CoinMarketCapService>(CoinMarketCapService);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('getProviderName', () => {
    it('should return CoinMarketCap', () => {
      expect(service.getProviderName()).toBe('CoinMarketCap');
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is available', () => {
      process.env.COINMARKETCAP_API_KEY = 'test-key';
      expect(service.isAvailable()).toBe(true);
    });

    it('should return false when API key is not available', () => {
      delete process.env.COINMARKETCAP_API_KEY;
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('fetchAssetPrices', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
      process.env.COINMARKETCAP_API_KEY = 'test-key';
    });

    it('should return empty array for empty symbols', async () => {
      const result = await service.fetchAssetPrices([], 'USD');
      expect(result).toEqual([]);
    });

    it('should filter out symbols with special characters', async () => {
      const result = await service.fetchAssetPrices(['BTC-USD', 'ETH.USD'], 'USD');
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should successfully fetch asset prices', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          data: {
            BTC: [
              {
                id: 1,
                name: 'Bitcoin',
                symbol: 'BTC',
                slug: 'bitcoin',
                is_active: 1,
                quote: {
                  USD: {
                    price: 50000,
                    volume_24h: 1000000,
                    percent_change_1h: 1.5,
                    percent_change_24h: 2.5,
                    percent_change_7d: 10.5,
                    market_cap: 1000000000,
                    last_updated: '2023-01-01T00:00:00.000Z',
                  },
                },
              },
            ],
          },
          status: {
            timestamp: '2023-01-01T00:00:00.000Z',
            error_code: 0,
            error_message: null,
            elapsed: 10,
            credit_count: 1,
          },
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.fetchAssetPrices(['BTC'], 'USD');

      expect(result).toEqual([
        {
          symbol: 'BTC',
          price: 50000,
          currency: 'USD',
        },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=BTC&convert=USD',
        expect.objectContaining({
          headers: {
            'X-CMC_PRO_API_KEY': 'test-key',
            Accept: 'application/json',
          },
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should skip inactive assets', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          data: {
            INACTIVE: [
              {
                id: 1,
                name: 'Inactive Token',
                symbol: 'INACTIVE',
                slug: 'inactive-token',
                is_active: 0,
                quote: {
                  USD: {
                    price: 1,
                    volume_24h: 0,
                    percent_change_1h: 0,
                    percent_change_24h: 0,
                    percent_change_7d: 0,
                    market_cap: 0,
                    last_updated: '2023-01-01T00:00:00.000Z',
                  },
                },
              },
            ],
          },
          status: {
            timestamp: '2023-01-01T00:00:00.000Z',
            error_code: 0,
            error_message: null,
            elapsed: 10,
            credit_count: 1,
          },
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.fetchAssetPrices(['INACTIVE'], 'USD');

      expect(result).toEqual([]);
    });

    it('should throw error when API key is not configured', async () => {
      delete process.env.COINMARKETCAP_API_KEY;

      await expect(service.fetchAssetPrices(['BTC'], 'USD')).rejects.toThrow(
        'CoinMarketCap API key not configured',
      );
    });

    it('should throw error on API error response', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key',
      };

      mockFetch.mockResolvedValue(mockResponse);

      await expect(service.fetchAssetPrices(['BTC'], 'USD')).rejects.toThrow(
        'CoinMarketCap API error: 401 Unauthorized - Invalid API key',
      );
    });

    it('should handle fetch timeout', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 100);
          }),
      );

      await expect(service.fetchAssetPrices(['BTC'], 'USD')).rejects.toThrow();
    });
  });
});
