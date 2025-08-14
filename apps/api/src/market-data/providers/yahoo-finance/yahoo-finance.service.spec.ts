import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import yahooFinance from 'yahoo-finance2';

import { convertCurrency } from '@/market-data/utils';

import { YahooFinanceService } from './yahoo-finance.service';

// Mock yahoo-finance2
vi.mock('yahoo-finance2', () => ({
  default: {
    quote: vi.fn(),
  },
}));

// Mock currency converter
vi.mock('@/market-data/utils', () => ({
  convertCurrency: vi.fn(),
}));

const mockYahooFinance = vi.mocked(yahooFinance);
const mockConvertCurrency = vi.mocked(convertCurrency);

describe('YahooFinanceService', () => {
  let service: YahooFinanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YahooFinanceService],
    }).compile();

    service = module.get<YahooFinanceService>(YahooFinanceService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getProviderName', () => {
    it('should return YahooFinance', () => {
      expect(service.getProviderName()).toBe('YahooFinance');
    });
  });

  describe('isAvailable', () => {
    it('should always return true', () => {
      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('fetchAssetPrices', () => {
    it('should return empty array for empty symbols', async () => {
      const result = await service.fetchAssetPrices([], 'USD');
      expect(result).toEqual([]);
      expect(mockYahooFinance.quote).not.toHaveBeenCalled();
    });

    it('should fetch asset prices successfully for USD', async () => {
      mockYahooFinance.quote.mockResolvedValueOnce({
        regularMarketPrice: 150.25,
        currency: 'USD',
      });

      const result = await service.fetchAssetPrices(['AAPL'], 'USD');

      expect(result).toEqual([
        {
          symbol: 'AAPL',
          price: 150.25,
          currency: 'USD',
        },
      ]);
      expect(mockYahooFinance.quote).toHaveBeenCalledWith('AAPL');
    });

    it('should handle missing quote data', async () => {
      mockYahooFinance.quote.mockResolvedValueOnce(null);

      const result = await service.fetchAssetPrices(['INVALID'], 'USD');

      expect(result).toEqual([]);
    });

    it('should handle API errors and return zero price', async () => {
      mockYahooFinance.quote.mockRejectedValueOnce(new Error('Yahoo Finance error'));

      const result = await service.fetchAssetPrices(['ERROR_SYMBOL'], 'USD');

      expect(result).toEqual([
        {
          symbol: 'ERROR_SYMBOL',
          price: 0,
          currency: 'USD',
        },
      ]);
    });

    it('should handle missing price in quote', async () => {
      mockYahooFinance.quote.mockResolvedValueOnce({
        currency: 'USD',
        // regularMarketPrice is missing
      });

      const result = await service.fetchAssetPrices(['NO_PRICE'], 'USD');

      expect(result).toEqual([
        {
          symbol: 'NO_PRICE',
          price: 0,
          currency: 'USD',
        },
      ]);
    });

    it('should handle currency conversion', async () => {
      mockYahooFinance.quote.mockResolvedValueOnce({
        regularMarketPrice: 150.25,
        currency: 'USD',
      });
      mockConvertCurrency.mockResolvedValueOnce(127.5);

      const result = await service.fetchAssetPrices(['AAPL'], 'EUR');

      expect(result).toEqual([
        {
          symbol: 'AAPL',
          price: 127.5,
          currency: 'USD',
        },
      ]);
      expect(mockConvertCurrency).toHaveBeenCalledWith(150.25, 'USD', 'EUR', 10000);
    });

    it('should handle currency conversion failure', async () => {
      mockYahooFinance.quote.mockResolvedValueOnce({
        regularMarketPrice: 150.25,
        currency: 'USD',
      });
      mockConvertCurrency.mockRejectedValueOnce(new Error('Conversion failed'));

      const result = await service.fetchAssetPrices(['AAPL'], 'EUR');

      expect(result).toEqual([
        {
          symbol: 'AAPL',
          price: 150.25,
          currency: 'USD',
        },
      ]);
    });

    it('should handle multiple symbols', async () => {
      mockYahooFinance.quote
        .mockResolvedValueOnce({
          regularMarketPrice: 150.25,
          currency: 'USD',
        })
        .mockResolvedValueOnce({
          regularMarketPrice: 2750.8,
          currency: 'USD',
        });

      const result = await service.fetchAssetPrices(['AAPL', 'GOOGL'], 'USD');

      expect(result).toEqual([
        {
          symbol: 'AAPL',
          price: 150.25,
          currency: 'USD',
        },
        {
          symbol: 'GOOGL',
          price: 2750.8,
          currency: 'USD',
        },
      ]);
    });
  });
});
