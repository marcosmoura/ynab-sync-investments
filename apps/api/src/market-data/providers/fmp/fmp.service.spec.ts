import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

import { FMPService } from './fmp.service';

describe('FMPService', () => {
  let service: FMPService;
  const originalEnv = process.env;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FMPService],
    }).compile();

    service = module.get<FMPService>(FMPService);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('getProviderName', () => {
    it('should return Financial Modeling Prep', () => {
      expect(service.getProviderName()).toBe('Financial Modeling Prep');
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is available', () => {
      process.env.FMP_API_KEY = 'test-key';
      expect(service.isAvailable()).toBe(true);
    });

    it('should return false when API key is not available', () => {
      delete process.env.FMP_API_KEY;
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('fetchAssetPrices', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
      process.env.FMP_API_KEY = 'test-key';
    });

    it('should return empty array for empty symbols', async () => {
      const result = await service.fetchAssetPrices([], 'USD');
      expect(result).toEqual([]);
    });

    it('should successfully fetch European stock prices', async () => {
      const mockResponse = {
        ok: true,
        json: async () => [
          {
            symbol: 'ASML.AS',
            name: 'ASML Holding N.V.',
            price: 650.25,
            changesPercentage: 1.5,
            change: 9.75,
            dayLow: 645.0,
            dayHigh: 655.0,
            yearHigh: 800.0,
            yearLow: 500.0,
            marketCap: 250000000000,
            priceAvg50: 620.0,
            priceAvg200: 580.0,
            exchange: 'NASDAQ',
            volume: 1000000,
            avgVolume: 800000,
            open: 648.0,
            previousClose: 640.5,
            eps: 25.5,
            pe: 25.5,
            earningsAnnouncement: '2024-01-24T00:00:00.000+0000',
            sharesOutstanding: 400000000,
            timestamp: 1640995200,
          },
        ],
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.fetchAssetPrices(['ASML.AS'], 'USD');

      expect(result).toEqual([
        {
          symbol: 'ASML.AS',
          price: 650.25,
          currency: 'USD',
        },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://financialmodelingprep.com/api/v3/quote/ASML.AS?apikey=test-key',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should successfully fetch European ETF prices', async () => {
      // Mock stock response with no results to test fallback to ETF
      const mockStockResponse = {
        ok: true,
        json: async () => [],
      };

      const mockEtfResponse = {
        ok: true,
        json: async () => [
          {
            symbol: 'IWDA.AS',
            name: 'iShares Core MSCI World UCITS ETF',
            price: 85.5,
            changesPercentage: 0.8,
            change: 0.68,
            dayLow: 85.0,
            dayHigh: 86.0,
            yearHigh: 90.0,
            yearLow: 70.0,
            marketCap: 50000000000,
            volume: 500000,
            avgVolume: 400000,
            exchange: 'NASDAQ',
            open: 85.2,
            previousClose: 84.82,
            timestamp: 1640995200,
          },
        ],
      };

      mockFetch
        .mockResolvedValueOnce(mockStockResponse) // Stock attempt
        .mockResolvedValueOnce(mockEtfResponse); // ETF attempt

      const result = await service.fetchAssetPrices(['IWDA.AS'], 'USD');

      expect(result).toEqual([
        {
          symbol: 'IWDA.AS',
          price: 85.5,
          currency: 'USD',
        },
      ]);
    });

    it('should successfully fetch European index prices', async () => {
      // Mock stock and ETF responses with no results to test fallback to index
      const mockEmptyResponse = {
        ok: true,
        json: async () => [],
      };

      const mockIndexResponse = {
        ok: true,
        json: async () => [
          {
            symbol: '^GDAXI',
            name: 'DAX PERFORMANCE-INDEX',
            price: 15500.75,
            changesPercentage: 1.2,
            change: 184.25,
            dayLow: 15400.0,
            dayHigh: 15600.0,
            yearHigh: 16500.0,
            yearLow: 14000.0,
            marketCap: 0,
            volume: 0,
            avgVolume: 0,
            exchange: 'XETRA',
            open: 15450.0,
            previousClose: 15316.5,
            timestamp: 1640995200,
          },
        ],
      };

      mockFetch
        .mockResolvedValueOnce(mockEmptyResponse) // Stock attempt
        .mockResolvedValueOnce(mockEmptyResponse) // ETF attempt
        .mockResolvedValueOnce(mockIndexResponse); // Index attempt

      const result = await service.fetchAssetPrices(['DAX'], 'USD');

      expect(result).toEqual([
        {
          symbol: 'DAX',
          price: 15500.75,
          currency: 'USD',
        },
      ]);

      // Verify that the DAX was mapped to ^GDAXI
      expect(mockFetch).toHaveBeenCalledWith(
        'https://financialmodelingprep.com/api/v3/quote/%5EGDAXI?apikey=test-key',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should handle currency conversion', async () => {
      const mockStockResponse = {
        ok: true,
        json: async () => [
          {
            symbol: 'SAP.DE',
            name: 'SAP SE',
            price: 120.0,
            changesPercentage: 0.5,
            change: 0.6,
            dayLow: 119.0,
            dayHigh: 121.0,
            yearHigh: 140.0,
            yearLow: 100.0,
            marketCap: 140000000000,
            volume: 800000,
            avgVolume: 600000,
            exchange: 'XETRA',
            open: 119.5,
            previousClose: 119.4,
            timestamp: 1640995200,
          },
        ],
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

      const result = await service.fetchAssetPrices(['SAP.DE'], 'EUR');

      expect(result).toEqual([
        {
          symbol: 'SAP.DE',
          price: 102.0, // 120 * 0.85
          currency: 'EUR',
        },
      ]);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid API key',
      });

      const result = await service.fetchAssetPrices(['ASML.AS'], 'USD');

      expect(result).toEqual([]);
    });

    it('should handle fetch timeout', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 100);
          }),
      );

      const result = await service.fetchAssetPrices(['ASML.AS'], 'USD');

      // Should return empty array when requests fail
      expect(result).toEqual([]);
    });

    it('should respect daily rate limits', async () => {
      // Mock the service's private property to simulate hitting the limit
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).fmpRequestCount = 250; // Set to limit

      const result = await service.fetchAssetPrices(['ASML.AS'], 'USD');

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
