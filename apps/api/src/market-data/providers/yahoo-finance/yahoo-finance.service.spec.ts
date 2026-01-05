import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, afterEach, describe, it, expect, vi, type Mock } from 'vitest';

import { convertCurrency } from '@/market-data/utils';

import { YahooFinanceService } from './yahoo-finance.service';

// Mock yahoo-finance2
const { quoteMock, yahooFinanceConstructorMock } = vi.hoisted(() => {
  const quote: Mock = vi.fn();
  const ctor: Mock = vi.fn().mockImplementation(() => ({
    quote,
  }));

  return {
    quoteMock: quote,
    yahooFinanceConstructorMock: ctor,
  };
});

vi.mock('yahoo-finance2', () => ({
  __esModule: true,
  default: yahooFinanceConstructorMock,
}));

// Mock currency converter
vi.mock('@/market-data/utils', () => ({
  convertCurrency: vi.fn(),
}));

const mockConvertCurrency = vi.mocked(convertCurrency);

describe('YahooFinanceService', () => {
  let service: YahooFinanceService;

  beforeEach(async () => {
    quoteMock.mockReset();
    mockConvertCurrency.mockReset();
    yahooFinanceConstructorMock.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [YahooFinanceService],
    }).compile();

    service = module.get<YahooFinanceService>(YahooFinanceService);
  });

  afterEach(() => {
    vi.clearAllMocks();
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
      expect(quoteMock).not.toHaveBeenCalled();
    });

    it('should fetch asset prices successfully for USD', async () => {
      quoteMock.mockResolvedValueOnce({
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
      expect(quoteMock).toHaveBeenCalledWith('AAPL');
    });

    it('should handle missing quote data', async () => {
      quoteMock.mockResolvedValueOnce(null);

      const result = await service.fetchAssetPrices(['INVALID'], 'USD');

      expect(result).toEqual([]);
    });

    it('should handle API errors and return empty array', async () => {
      quoteMock.mockRejectedValueOnce(new Error('Yahoo Finance error'));

      const result = await service.fetchAssetPrices(['ERROR_SYMBOL'], 'USD');

      expect(result).toEqual([]);
    });

    it('should handle missing price in quote', async () => {
      quoteMock.mockResolvedValueOnce({
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
      quoteMock.mockResolvedValueOnce({
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
      quoteMock.mockResolvedValueOnce({
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
      quoteMock
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
