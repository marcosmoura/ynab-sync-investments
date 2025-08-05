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
    it('should return mock price for stock symbols', async () => {
      const result = await service.getAssetPrice('AAPL', 'USD');

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 100.0, // The getCryptoPrice/getStockPrice methods return 100.0
        currency: 'USD',
      });
    });

    it('should return mock price for unknown symbols', async () => {
      const result = await service.getAssetPrice('UNKNOWN', 'USD');

      expect(result).toEqual({
        symbol: 'UNKNOWN',
        price: 100.0,
        currency: 'USD',
      });
    });

    it('should return mock price for crypto symbols', async () => {
      const result = await service.getAssetPrice('BTC', 'USD');

      expect(result).toEqual({
        symbol: 'BTC',
        price: 100.0, // The getCryptoPrice method returns 100.0
        currency: 'USD',
      });
    });

    it('should use default currency when not specified', async () => {
      const result = await service.getAssetPrice('MSFT');

      expect(result).toEqual({
        symbol: 'MSFT',
        price: 100.0, // The getStockPrice method returns 100.0
        currency: 'USD',
      });
    });
  });

  describe('convertCurrency', () => {
    it('should return same amount for same currency', async () => {
      const result = await service.convertCurrency(100, 'USD', 'USD');
      expect(result).toBe(100);
    });

    it('should return amount for different currencies (mock)', async () => {
      const result = await service.convertCurrency(100, 'EUR', 'USD');
      expect(result).toBe(100); // Mock implementation returns same amount
    });

    it('should handle conversion errors gracefully', async () => {
      // The service returns the original amount as fallback
      const result = await service.convertCurrency(50, 'INVALID', 'USD');
      expect(result).toBe(50);
    });
  });
});
