import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

import { PolygonService } from './polygon.service';

describe('PolygonService', () => {
  let service: PolygonService;
  const originalEnv = process.env;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PolygonService],
    }).compile();

    service = module.get<PolygonService>(PolygonService);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('getProviderName', () => {
    it('should return Polygon.io', () => {
      expect(service.getProviderName()).toBe('Polygon.io');
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is available', () => {
      process.env.POLYGON_API_KEY = 'test-key';
      expect(service.isAvailable()).toBe(true);
    });

    it('should return false when API key is not available', () => {
      delete process.env.POLYGON_API_KEY;
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('fetchAssetPrices', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
      process.env.POLYGON_API_KEY = 'test-key';
    });

    it('should return empty array for empty symbols', async () => {
      const result = await service.fetchAssetPrices([], 'USD');
      expect(result).toEqual([]);
    });

    it('should successfully fetch stock prices', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          results: [
            {
              c: 150.25, // close price
              h: 155.0, // high
              l: 148.0, // low
              o: 152.0, // open
              v: 1000000, // volume
            },
          ],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.fetchAssetPrices(['AAPL'], 'USD');

      expect(result).toEqual([
        {
          symbol: 'AAPL',
          price: 150.25,
          currency: 'USD',
        },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.polygon.io/v2/aggs/ticker/AAPL/prev?adjusted=true&apikey=test-key',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should properly URL encode symbols with special characters', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          results: [
            {
              c: 25.5, // close price
              h: 26.0, // high
              l: 24.5, // low
              o: 25.0, // open
              v: 10000, // volume
            },
          ],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.fetchAssetPrices(['NSQE.DE'], 'USD');

      expect(result).toEqual([
        {
          symbol: 'NSQE.DE',
          price: 25.5,
          currency: 'USD',
        },
      ]);

      // Verify that the symbol was properly URL encoded in the request
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.polygon.io/v2/aggs/ticker/NSQE.DE/prev?adjusted=true&apikey=test-key',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should try indices for symbols not found in stocks', async () => {
      // First call for stock returns no results
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        })
        // Second call for index returns results
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [
              {
                c: 4500.0,
                h: 4550.0,
                l: 4450.0,
                o: 4480.0,
                v: 500000,
              },
            ],
          }),
        });

      const result = await service.fetchAssetPrices(['SPX'], 'USD');

      expect(result).toEqual([
        {
          symbol: 'SPX',
          price: 4500.0,
          currency: 'USD',
        },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.polygon.io/v2/aggs/ticker/SPX/prev?adjusted=true&apikey=test-key',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.polygon.io/v2/aggs/ticker/I:SPX/prev?adjusted=true&apikey=test-key',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should throw error when API key is not configured', async () => {
      delete process.env.POLYGON_API_KEY;

      await expect(service.fetchAssetPrices(['AAPL'], 'USD')).rejects.toThrow(
        'Polygon API key not configured',
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
          results: [
            {
              c: 100.0,
              h: 105.0,
              l: 95.0,
              o: 98.0,
              v: 1000000,
            },
          ],
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
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 100);
          }),
      );

      const result = await service.fetchAssetPrices(['AAPL'], 'USD');

      // Should return empty array when requests fail
      expect(result).toEqual([]);
    });
  });
});
