import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { GetAssetPriceDto, ConvertCurrencyDto, AssetPriceResponseDto } from './dto';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';

describe('MarketDataController', () => {
  let controller: MarketDataController;
  let service: MarketDataService;

  const mockMarketDataService = {
    getAssetPrice: vi.fn(),
    convertCurrency: vi.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MarketDataController],
      providers: [
        {
          provide: MarketDataService,
          useValue: mockMarketDataService,
        },
      ],
    }).compile();

    service = moduleRef.get(MarketDataService);
    controller = moduleRef.get(MarketDataController);

    // Reset mocks
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('getAssetPrice', () => {
    it('should get asset price with default currency', async () => {
      const dto: GetAssetPriceDto = { symbol: 'AAPL' };
      const serviceResult = { symbol: 'AAPL', price: 150.0, currency: 'USD' };

      mockMarketDataService.getAssetPrice.mockResolvedValue(serviceResult);

      const result = await controller.getAssetPrice(dto);

      expect(mockMarketDataService.getAssetPrice).toHaveBeenCalledWith('AAPL', 'USD');
      expect(result).toBeInstanceOf(AssetPriceResponseDto);
      expect(result.symbol).toBe('AAPL');
      expect(result.price).toBe(150.0);
      expect(result.currency).toBe('USD');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should get asset price with custom currency', async () => {
      const dto: GetAssetPriceDto = { symbol: 'BTC', targetCurrency: 'EUR' };
      const serviceResult = { symbol: 'BTC', price: 40000.0, currency: 'EUR' };

      mockMarketDataService.getAssetPrice.mockResolvedValue(serviceResult);

      const result = await controller.getAssetPrice(dto);

      expect(mockMarketDataService.getAssetPrice).toHaveBeenCalledWith('BTC', 'EUR');
      expect(result.symbol).toBe('BTC');
      expect(result.price).toBe(40000.0);
      expect(result.currency).toBe('EUR');
    });

    it('should handle service errors', async () => {
      const dto: GetAssetPriceDto = { symbol: 'INVALID' };

      mockMarketDataService.getAssetPrice.mockRejectedValue(new Error('Price not found'));

      await expect(controller.getAssetPrice(dto)).rejects.toThrow('Price not found');
      expect(mockMarketDataService.getAssetPrice).toHaveBeenCalledWith('INVALID', 'USD');
    });
  });

  describe('convertCurrency', () => {
    it('should convert currency', async () => {
      const dto: ConvertCurrencyDto = {
        amount: 100,
        fromCurrency: 'EUR',
        toCurrency: 'USD',
      };

      mockMarketDataService.convertCurrency.mockResolvedValue(110.5);

      const result = await controller.convertCurrency(dto);

      expect(mockMarketDataService.convertCurrency).toHaveBeenCalledWith(100, 'EUR', 'USD');
      expect(result).toEqual({ convertedAmount: 110.5 });
    });

    it('should handle same currency conversion', async () => {
      const dto: ConvertCurrencyDto = {
        amount: 50,
        fromCurrency: 'USD',
        toCurrency: 'USD',
      };

      mockMarketDataService.convertCurrency.mockResolvedValue(50);

      const result = await controller.convertCurrency(dto);

      expect(mockMarketDataService.convertCurrency).toHaveBeenCalledWith(50, 'USD', 'USD');
      expect(result).toEqual({ convertedAmount: 50 });
    });

    it('should handle service errors in currency conversion', async () => {
      const dto: ConvertCurrencyDto = {
        amount: 100,
        fromCurrency: 'INVALID',
        toCurrency: 'USD',
      };

      mockMarketDataService.convertCurrency.mockRejectedValue(new Error('Invalid currency'));

      await expect(controller.convertCurrency(dto)).rejects.toThrow('Invalid currency');
    });
  });
});

describe('AssetPriceResponseDto', () => {
  it('should create instance with provided timestamp', () => {
    const timestamp = new Date('2023-12-01T15:30:00Z');
    const dto = new AssetPriceResponseDto('AAPL', 150.25, 'USD', timestamp);

    expect(dto.symbol).toBe('AAPL');
    expect(dto.price).toBe(150.25);
    expect(dto.currency).toBe('USD');
    expect(dto.timestamp).toBe(timestamp);
  });

  it('should create instance with default timestamp when not provided', () => {
    const beforeCreation = Date.now();
    const dto = new AssetPriceResponseDto('AAPL', 150.25, 'USD');
    const afterCreation = Date.now();

    expect(dto.symbol).toBe('AAPL');
    expect(dto.price).toBe(150.25);
    expect(dto.currency).toBe('USD');
    expect(dto.timestamp).toBeInstanceOf(Date);
    expect(dto.timestamp?.getTime()).toBeGreaterThanOrEqual(beforeCreation);
    expect(dto.timestamp?.getTime()).toBeLessThanOrEqual(afterCreation);
  });
});

describe('MarketDataService', () => {
  let service: MarketDataService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [MarketDataService],
    }).compile();

    service = moduleRef.get(MarketDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAssetPrice', () => {
    beforeEach(() => {
      // Mock the fetch method to avoid real API calls in tests
      global.fetch = vi.fn() as unknown as typeof fetch;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return price for stock symbols with Alpha Vantage API', async () => {
      const mockResponse = {
        'Global Quote': {
          '05. price': '150.00',
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      // Mock environment variable
      process.env.ALPHA_VANTAGE_API_KEY = 'test-key';

      const result = await service.getAssetPrice('AAPL', 'USD');

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150.0,
        currency: 'USD',
      });
    });

    it('should return price for crypto symbols with CoinGecko API', async () => {
      const mockResponse = {
        bitcoin: {
          usd: 45000.0,
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await service.getAssetPrice('BTC', 'USD');

      expect(result).toEqual({
        symbol: 'BTC',
        price: 45000.0,
        currency: 'USD',
      });
    });

    it('should fallback to mock prices when API fails', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('API Error'));

      const result = await service.getAssetPrice('AAPL', 'USD');

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150.0, // Fallback price
        currency: 'USD',
      });
    });

    it('should throw error for unknown symbols when API fails and no fallback exists', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('API Error'));

      await expect(service.getAssetPrice('UNKNOWN', 'USD')).rejects.toThrow(
        'Failed to fetch price for UNKNOWN',
      );
    });

    it('should use default currency when not specified', async () => {
      const mockResponse = {
        'Global Quote': {
          '05. price': '300.00',
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      process.env.ALPHA_VANTAGE_API_KEY = 'test-key';

      const result = await service.getAssetPrice('MSFT');

      expect(result).toEqual({
        symbol: 'MSFT',
        price: 300.0,
        currency: 'USD',
      });
    });

    it('should convert stock price to target currency when different from USD', async () => {
      const mockStockResponse = {
        'Global Quote': {
          '05. price': '100.00',
        },
      };

      const mockConversionResponse = {
        rates: {
          EUR: 0.85,
        },
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStockResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockConversionResponse),
        } as Response);

      process.env.ALPHA_VANTAGE_API_KEY = 'test-key';

      const result = await service.getAssetPrice('AAPL', 'EUR');

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 85.0, // 100 * 0.85
        currency: 'EUR',
      });
    });

    it('should fallback to USD price when currency conversion fails', async () => {
      const mockStockResponse = {
        'Global Quote': {
          '05. price': '100.00',
        },
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStockResponse),
        } as Response)
        .mockRejectedValueOnce(new Error('Currency conversion failed'));

      process.env.ALPHA_VANTAGE_API_KEY = 'test-key';

      const result = await service.getAssetPrice('AAPL', 'EUR');

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 100.0, // Fallback to USD price
        currency: 'EUR',
      });
    });

    it('should throw error when stock price not found in API response', async () => {
      const mockResponse = {
        'Global Quote': {
          // Missing '05. price' field
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      process.env.ALPHA_VANTAGE_API_KEY = 'test-key';

      await expect(service.getAssetPrice('INVALID', 'USD')).rejects.toThrow(
        'Failed to fetch price for INVALID',
      );
    });

    it('should throw error when Global Quote is missing from API response', async () => {
      const mockResponse = {
        // Missing 'Global Quote' field
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      process.env.ALPHA_VANTAGE_API_KEY = 'test-key';

      await expect(service.getAssetPrice('INVALID', 'USD')).rejects.toThrow(
        'Failed to fetch price for INVALID',
      );
    });
  });

  describe('convertCurrency', () => {
    beforeEach(() => {
      // Mock the fetch method to avoid real API calls in tests
      global.fetch = vi.fn() as unknown as typeof fetch;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return same amount for same currency', async () => {
      const result = await service.convertCurrency(100, 'USD', 'USD');
      expect(result).toBe(100);
    });

    it('should convert between different currencies using exchange rate API', async () => {
      const mockResponse = {
        rates: {
          USD: 1.16,
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await service.convertCurrency(100, 'EUR', 'USD');
      expect(result).toBeCloseTo(116, 1); // 100 * 1.16, allowing for floating point precision
    });

    it('should handle conversion errors gracefully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      // The service returns the original amount as fallback
      const result = await service.convertCurrency(50, 'INVALID', 'USD');
      expect(result).toBe(50);
    });

    it('should handle missing exchange rate gracefully', async () => {
      const mockResponse = {
        rates: {
          // Missing target currency
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      // The service returns the original amount as fallback
      const result = await service.convertCurrency(100, 'EUR', 'INVALID');
      expect(result).toBe(100);
    });

    it('should handle API response with invalid data', async () => {
      const mockResponse = {}; // Missing rates property

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      // The service returns the original amount as fallback
      const result = await service.convertCurrency(50, 'EUR', 'USD');
      expect(result).toBe(50);
    });

    it('should handle fetch rejection gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      // The service returns the original amount as fallback
      const result = await service.convertCurrency(75, 'EUR', 'USD');
      expect(result).toBe(75);
    });
  });
});
