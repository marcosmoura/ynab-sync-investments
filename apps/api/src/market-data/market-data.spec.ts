import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

import { GetMultipleAssetPricesDto, BulkAssetPriceResponseDto } from './dto';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { AlphaVantageService } from './providers/alpha-vantage/alpha-vantage.service';
import { CoinMarketCapService } from './providers/coinmarketcap/coinmarketcap.service';
import { FinnhubService } from './providers/finnhub/finnhub.service';
import { PolygonService } from './providers/polygon/polygon.service';
import { AssetResult } from './providers/types';

describe('MarketDataService', () => {
  let service: MarketDataService;
  let coinMarketCapService: CoinMarketCapService;
  let polygonService: PolygonService;
  let finnhubService: FinnhubService;
  let alphaVantageService: AlphaVantageService;

  const mockAssetResult: AssetResult = {
    symbol: 'AAPL',
    price: 150.25,
    currency: 'USD',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketDataService,
        {
          provide: CoinMarketCapService,
          useValue: {
            isAvailable: vi.fn().mockReturnValue(true),
            getProviderName: vi.fn().mockReturnValue('CoinMarketCap'),
            fetchAssetPrices: vi.fn(),
          },
        },
        {
          provide: PolygonService,
          useValue: {
            isAvailable: vi.fn().mockReturnValue(true),
            getProviderName: vi.fn().mockReturnValue('Polygon'),
            fetchAssetPrices: vi.fn(),
          },
        },
        {
          provide: FinnhubService,
          useValue: {
            isAvailable: vi.fn().mockReturnValue(true),
            getProviderName: vi.fn().mockReturnValue('Finnhub'),
            fetchAssetPrices: vi.fn(),
          },
        },
        {
          provide: AlphaVantageService,
          useValue: {
            isAvailable: vi.fn().mockReturnValue(true),
            getProviderName: vi.fn().mockReturnValue('AlphaVantage'),
            fetchAssetPrices: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MarketDataService>(MarketDataService);
    coinMarketCapService = module.get<CoinMarketCapService>(CoinMarketCapService);
    polygonService = module.get<PolygonService>(PolygonService);
    finnhubService = module.get<FinnhubService>(FinnhubService);
    alphaVantageService = module.get<AlphaVantageService>(AlphaVantageService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should filter and initialize available providers', () => {
      expect(service.getAvailableProviders()).toEqual([
        'CoinMarketCap',
        'Finnhub',
        'Polygon',
        'AlphaVantage',
      ]);
    });

    it('should filter out unavailable providers', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MarketDataService,
          {
            provide: CoinMarketCapService,
            useValue: {
              isAvailable: vi.fn().mockReturnValue(false),
              getProviderName: vi.fn().mockReturnValue('CoinMarketCap'),
              fetchAssetPrices: vi.fn(),
            },
          },
          {
            provide: PolygonService,
            useValue: {
              isAvailable: vi.fn().mockReturnValue(true),
              getProviderName: vi.fn().mockReturnValue('Polygon'),
              fetchAssetPrices: vi.fn(),
            },
          },
          {
            provide: FinnhubService,
            useValue: {
              isAvailable: vi.fn().mockReturnValue(false),
              getProviderName: vi.fn().mockReturnValue('Finnhub'),
              fetchAssetPrices: vi.fn(),
            },
          },
          {
            provide: AlphaVantageService,
            useValue: {
              isAvailable: vi.fn().mockReturnValue(true),
              getProviderName: vi.fn().mockReturnValue('AlphaVantage'),
              fetchAssetPrices: vi.fn(),
            },
          },
        ],
      }).compile();

      const testService = module.get<MarketDataService>(MarketDataService);
      expect(testService.getAvailableProviders()).toEqual(['Polygon', 'AlphaVantage']);
    });
  });

  describe('getAssetPrices', () => {
    it('should return empty array for empty symbols', async () => {
      const result = await service.getAssetPrices([]);
      expect(result).toEqual([]);
    });

    it('should fetch asset prices from first available provider', async () => {
      // Setup: Mock the first provider to return a result
      vi.mocked(coinMarketCapService.fetchAssetPrices).mockResolvedValue([mockAssetResult]);

      const result = await service.getAssetPrices(['AAPL'], 'USD');

      expect(result).toEqual([mockAssetResult]);
      // The provider is called, regardless of the exact parameters
      expect(coinMarketCapService.fetchAssetPrices).toHaveBeenCalled();
      expect(polygonService.fetchAssetPrices).not.toHaveBeenCalled();
      expect(finnhubService.fetchAssetPrices).not.toHaveBeenCalled();
      expect(alphaVantageService.fetchAssetPrices).not.toHaveBeenCalled();
    });

    it('should try next provider if first one fails', async () => {
      vi.mocked(coinMarketCapService.fetchAssetPrices).mockRejectedValue(new Error('API error'));
      vi.mocked(polygonService.fetchAssetPrices).mockResolvedValue([mockAssetResult]);

      const result = await service.getAssetPrices(['AAPL'], 'USD');

      expect(result).toEqual([mockAssetResult]);
      expect(coinMarketCapService.fetchAssetPrices).toHaveBeenCalled();
      expect(polygonService.fetchAssetPrices).toHaveBeenCalled();
    });

    it('should try multiple providers for different symbols', async () => {
      const appleResult = { symbol: 'AAPL', price: 150.25, currency: 'USD' };
      const googleResult = { symbol: 'GOOGL', price: 2800.5, currency: 'USD' };

      vi.mocked(coinMarketCapService.fetchAssetPrices).mockResolvedValue([appleResult]);
      vi.mocked(polygonService.fetchAssetPrices).mockResolvedValue([googleResult]);

      const result = await service.getAssetPrices(['AAPL', 'GOOGL'], 'USD');

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(appleResult);
      expect(result).toContainEqual(googleResult);
    });

    it('should handle partial results from providers', async () => {
      const appleResult = { symbol: 'AAPL', price: 150.25, currency: 'USD' };

      vi.mocked(coinMarketCapService.fetchAssetPrices).mockResolvedValue([appleResult]);
      vi.mocked(polygonService.fetchAssetPrices).mockResolvedValue([]);

      const result = await service.getAssetPrices(['AAPL', 'UNKNOWN'], 'USD');

      expect(result).toEqual([appleResult]);
      expect(coinMarketCapService.fetchAssetPrices).toHaveBeenCalled();
      expect(polygonService.fetchAssetPrices).toHaveBeenCalled();
    });

    it('should use default currency when not specified', async () => {
      vi.mocked(coinMarketCapService.fetchAssetPrices).mockResolvedValue([mockAssetResult]);

      await service.getAssetPrices(['AAPL']);

      expect(coinMarketCapService.fetchAssetPrices).toHaveBeenCalledWith(expect.any(Array), 'USD');
    });

    it('should handle case-insensitive symbol matching', async () => {
      const appleResult = { symbol: 'AAPL', price: 150.25, currency: 'USD' };
      vi.mocked(coinMarketCapService.fetchAssetPrices).mockResolvedValue([appleResult]);

      const result = await service.getAssetPrices(['aapl'], 'USD');

      expect(result).toEqual([appleResult]);
    });

    it('should log not found symbols when logNotFound is true', async () => {
      vi.mocked(coinMarketCapService.fetchAssetPrices).mockResolvedValue([]);
      vi.mocked(polygonService.fetchAssetPrices).mockResolvedValue([]);
      vi.mocked(finnhubService.fetchAssetPrices).mockResolvedValue([]);
      vi.mocked(alphaVantageService.fetchAssetPrices).mockResolvedValue([]);

      const loggerSpy = vi.spyOn(service['logger'], 'warn');

      await service.getAssetPrices(['UNKNOWN'], 'USD', true);

      expect(loggerSpy).toHaveBeenCalledWith('Assets not found in any provider: [UNKNOWN]');
    });

    it('should continue with next provider on error', async () => {
      vi.mocked(coinMarketCapService.fetchAssetPrices).mockRejectedValue(
        new Error('Network error'),
      );
      vi.mocked(polygonService.fetchAssetPrices).mockRejectedValue(new Error('API error'));
      vi.mocked(finnhubService.fetchAssetPrices).mockResolvedValue([mockAssetResult]);

      const result = await service.getAssetPrices(['AAPL'], 'USD');

      expect(result).toEqual([mockAssetResult]);
      expect(finnhubService.fetchAssetPrices).toHaveBeenCalled();
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available provider names', () => {
      const providers = service.getAvailableProviders();
      expect(providers).toEqual(['CoinMarketCap', 'Finnhub', 'Polygon', 'AlphaVantage']);
    });
  });
});

describe('MarketDataController', () => {
  let controller: MarketDataController;
  let service: MarketDataService;

  const mockAssetResult: AssetResult = {
    symbol: 'AAPL',
    price: 150.25,
    currency: 'USD',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketDataController],
      providers: [
        {
          provide: MarketDataService,
          useValue: {
            getAssetPrices: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MarketDataController>(MarketDataController);
    service = module.get<MarketDataService>(MarketDataService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getMultipleAssetPrices', () => {
    it('should return asset prices with correct format', async () => {
      const dto: GetMultipleAssetPricesDto = {
        symbols: ['AAPL'],
        targetCurrency: 'USD',
      };

      vi.mocked(service.getAssetPrices).mockResolvedValue([mockAssetResult]);

      const result = await controller.getMultipleAssetPrices(dto);

      expect(result).toBeInstanceOf(BulkAssetPriceResponseDto);
      expect(result.results).toEqual([mockAssetResult]);
      expect(result.notFound).toEqual([]);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(service.getAssetPrices).toHaveBeenCalledWith(['AAPL'], 'USD');
    });

    it('should use default currency when not provided', async () => {
      const dto: GetMultipleAssetPricesDto = {
        symbols: ['AAPL'],
      };

      vi.mocked(service.getAssetPrices).mockResolvedValue([mockAssetResult]);

      await controller.getMultipleAssetPrices(dto);

      expect(service.getAssetPrices).toHaveBeenCalledWith(['AAPL'], 'USD');
    });

    it('should handle multiple symbols', async () => {
      const dto: GetMultipleAssetPricesDto = {
        symbols: ['AAPL', 'GOOGL'],
        targetCurrency: 'USD',
      };

      const appleResult = { symbol: 'AAPL', price: 150.25, currency: 'USD' };
      const googleResult = { symbol: 'GOOGL', price: 2800.5, currency: 'USD' };

      vi.mocked(service.getAssetPrices).mockResolvedValue([appleResult, googleResult]);

      const result = await controller.getMultipleAssetPrices(dto);

      expect(result.results).toEqual([appleResult, googleResult]);
      expect(result.notFound).toEqual([]);
    });

    it('should identify not found symbols', async () => {
      const dto: GetMultipleAssetPricesDto = {
        symbols: ['AAPL', 'UNKNOWN'],
        targetCurrency: 'USD',
      };

      vi.mocked(service.getAssetPrices).mockResolvedValue([mockAssetResult]);

      const result = await controller.getMultipleAssetPrices(dto);

      expect(result.results).toEqual([mockAssetResult]);
      expect(result.notFound).toEqual(['UNKNOWN']);
    });

    it('should handle empty results', async () => {
      const dto: GetMultipleAssetPricesDto = {
        symbols: ['UNKNOWN'],
        targetCurrency: 'USD',
      };

      vi.mocked(service.getAssetPrices).mockResolvedValue([]);

      const result = await controller.getMultipleAssetPrices(dto);

      expect(result.results).toEqual([]);
      expect(result.notFound).toEqual(['UNKNOWN']);
    });

    it('should handle different target currencies', async () => {
      const dto: GetMultipleAssetPricesDto = {
        symbols: ['AAPL'],
        targetCurrency: 'EUR',
      };

      const eurResult = { symbol: 'AAPL', price: 135.5, currency: 'EUR' };
      vi.mocked(service.getAssetPrices).mockResolvedValue([eurResult]);

      const result = await controller.getMultipleAssetPrices(dto);

      expect(result.results).toEqual([eurResult]);
      expect(service.getAssetPrices).toHaveBeenCalledWith(['AAPL'], 'EUR');
    });
  });
});
