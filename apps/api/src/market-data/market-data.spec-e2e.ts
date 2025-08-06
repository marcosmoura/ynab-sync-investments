import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';

import { GetMultipleAssetPricesDto } from './dto';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { AlphaVantageService } from './providers/alpha-vantage/alpha-vantage.service';
import { CoinMarketCapService } from './providers/coinmarketcap/coinmarketcap.service';
import { FinnhubService } from './providers/finnhub/finnhub.service';
import { PolygonService } from './providers/polygon/polygon.service';
import { AssetResult } from './providers/types';

describe('MarketDataController (e2e)', () => {
  let app: INestApplication;
  let marketDataService: MarketDataService;

  const mockAssetResults: AssetResult[] = [
    {
      symbol: 'AAPL',
      price: 150.25,
      currency: 'USD',
    },
    {
      symbol: 'GOOGL',
      price: 2800.5,
      currency: 'USD',
    },
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MarketDataController],
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
            isAvailable: vi.fn().mockReturnValue(false),
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
            isAvailable: vi.fn().mockReturnValue(false),
            getProviderName: vi.fn().mockReturnValue('AlphaVantage'),
            fetchAssetPrices: vi.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    marketDataService = moduleFixture.get<MarketDataService>(MarketDataService);
    await app.init();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /market-data/asset-prices', () => {
    it('should return asset prices for valid symbols', () => {
      const requestBody: GetMultipleAssetPricesDto = {
        symbols: ['AAPL', 'GOOGL'],
        targetCurrency: 'USD',
      };

      vi.spyOn(marketDataService, 'getAssetPrices').mockResolvedValue(mockAssetResults);

      return request(app.getHttpServer())
        .post('/market-data/asset-prices')
        .send(requestBody)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('results');
          expect(res.body).toHaveProperty('notFound');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body.results).toHaveLength(2);
          expect(res.body.results[0]).toEqual(mockAssetResults[0]);
          expect(res.body.results[1]).toEqual(mockAssetResults[1]);
          expect(res.body.notFound).toEqual([]);
        });
    });

    it('should return partial results with not found symbols', () => {
      const requestBody: GetMultipleAssetPricesDto = {
        symbols: ['AAPL', 'UNKNOWN_SYMBOL'],
        targetCurrency: 'USD',
      };

      const partialResults = [mockAssetResults[0]]; // Only AAPL found
      vi.spyOn(marketDataService, 'getAssetPrices').mockResolvedValue(partialResults);

      return request(app.getHttpServer())
        .post('/market-data/asset-prices')
        .send(requestBody)
        .expect(201)
        .expect((res) => {
          expect(res.body.results).toHaveLength(1);
          expect(res.body.results[0]).toEqual(mockAssetResults[0]);
          expect(res.body.notFound).toEqual(['UNKNOWN_SYMBOL']);
        });
    });

    it('should use default currency when not provided', () => {
      const requestBody = {
        symbols: ['AAPL'],
      };

      vi.spyOn(marketDataService, 'getAssetPrices').mockResolvedValue([mockAssetResults[0]]);

      return request(app.getHttpServer())
        .post('/market-data/asset-prices')
        .send(requestBody)
        .expect(201)
        .expect((res) => {
          expect(res.body.results[0].currency).toBe('USD');
          expect(marketDataService.getAssetPrices).toHaveBeenCalledWith(['AAPL'], 'USD');
        });
    });

    it('should handle empty symbols array', () => {
      const requestBody: GetMultipleAssetPricesDto = {
        symbols: [],
        targetCurrency: 'USD',
      };

      return request(app.getHttpServer())
        .post('/market-data/asset-prices')
        .send(requestBody)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('symbols should not be empty');
        });
    });

    it('should validate symbols array contains only strings', () => {
      const requestBody = {
        symbols: ['AAPL', 123, null],
        targetCurrency: 'USD',
      };

      return request(app.getHttpServer())
        .post('/market-data/asset-prices')
        .send(requestBody)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('each value in symbols must be a string');
        });
    });

    it('should validate symbols array does not contain empty strings', () => {
      const requestBody = {
        symbols: ['AAPL', ''],
        targetCurrency: 'USD',
      };

      return request(app.getHttpServer())
        .post('/market-data/asset-prices')
        .send(requestBody)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('each value in symbols should not be empty');
        });
    });

    it('should validate targetCurrency is a string when provided', () => {
      const requestBody = {
        symbols: ['AAPL'],
        targetCurrency: 123,
      };

      return request(app.getHttpServer())
        .post('/market-data/asset-prices')
        .send(requestBody)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('targetCurrency must be a string');
        });
    });

    it('should handle different target currencies', () => {
      const requestBody: GetMultipleAssetPricesDto = {
        symbols: ['AAPL'],
        targetCurrency: 'EUR',
      };

      const eurResult = {
        symbol: 'AAPL',
        price: 135.5,
        currency: 'EUR',
      };

      vi.spyOn(marketDataService, 'getAssetPrices').mockResolvedValue([eurResult]);

      return request(app.getHttpServer())
        .post('/market-data/asset-prices')
        .send(requestBody)
        .expect(201)
        .expect((res) => {
          expect(res.body.results[0].currency).toBe('EUR');
          expect(res.body.results[0].price).toBe(135.5);
          expect(marketDataService.getAssetPrices).toHaveBeenCalledWith(['AAPL'], 'EUR');
        });
    });

    it('should handle missing request body', () => {
      return request(app.getHttpServer()).post('/market-data/asset-prices').expect(400);
    });

    it('should handle request body without symbols', () => {
      const requestBody = {
        targetCurrency: 'USD',
      };

      return request(app.getHttpServer())
        .post('/market-data/asset-prices')
        .send(requestBody)
        .expect(400)
        .expect((res) => {
          // Expect the error message to mention required field
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });

    it('should handle service errors gracefully', () => {
      const requestBody: GetMultipleAssetPricesDto = {
        symbols: ['AAPL'],
        targetCurrency: 'USD',
      };

      vi.spyOn(marketDataService, 'getAssetPrices').mockRejectedValue(
        new Error('Service unavailable'),
      );

      return request(app.getHttpServer())
        .post('/market-data/asset-prices')
        .send(requestBody)
        .expect(500);
    });

    it('should transform and validate request data', () => {
      const requestBody = {
        symbols: ['aapl', 'GOOGL'], // Mixed case
        targetCurrency: 'usd', // Lowercase
      };

      vi.spyOn(marketDataService, 'getAssetPrices').mockResolvedValue(mockAssetResults);

      return request(app.getHttpServer())
        .post('/market-data/asset-prices')
        .send(requestBody)
        .expect(201)
        .expect((_res) => {
          // The service should receive the symbols as provided
          expect(marketDataService.getAssetPrices).toHaveBeenCalledWith(['aapl', 'GOOGL'], 'usd');
        });
    });

    it('should return proper response structure for no results', () => {
      const requestBody: GetMultipleAssetPricesDto = {
        symbols: ['UNKNOWN1', 'UNKNOWN2'],
        targetCurrency: 'USD',
      };

      vi.spyOn(marketDataService, 'getAssetPrices').mockResolvedValue([]);

      return request(app.getHttpServer())
        .post('/market-data/asset-prices')
        .send(requestBody)
        .expect(201)
        .expect((res) => {
          expect(res.body.results).toEqual([]);
          expect(res.body.notFound).toEqual(['UNKNOWN1', 'UNKNOWN2']);
          expect(res.body.timestamp).toBeDefined();
          expect(new Date(res.body.timestamp)).toBeInstanceOf(Date);
        });
    });

    it('should handle large symbol arrays', () => {
      const largeSymbolArray = Array.from({ length: 50 }, (_, i) => `SYMBOL${i}`);
      const requestBody: GetMultipleAssetPricesDto = {
        symbols: largeSymbolArray,
        targetCurrency: 'USD',
      };

      vi.spyOn(marketDataService, 'getAssetPrices').mockResolvedValue([]);

      return request(app.getHttpServer())
        .post('/market-data/asset-prices')
        .send(requestBody)
        .expect(201)
        .expect((res) => {
          expect(res.body.results).toEqual([]);
          expect(res.body.notFound).toHaveLength(50);
          expect(marketDataService.getAssetPrices).toHaveBeenCalledWith(largeSymbolArray, 'USD');
        });
    });
  });
});
