import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { MarketDataModule } from './market-data.module';
import { MarketDataService } from './market-data.service';

describe('MarketDataController (e2e)', () => {
  let app: INestApplication;

  const mockMarketDataService = {
    getAssetPrice: vi.fn(),
    convertCurrency: vi.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MarketDataModule],
    })
      .overrideProvider(MarketDataService)
      .useValue(mockMarketDataService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/market-data/asset-price (GET)', () => {
    it('should get asset price with default currency', async () => {
      const mockPrice = { symbol: 'AAPL', price: 150.0, currency: 'USD' };
      mockMarketDataService.getAssetPrice.mockResolvedValue(mockPrice);

      const response = await request(app.getHttpServer())
        .get('/market-data/asset-price')
        .query({ symbol: 'AAPL' })
        .expect(200);

      expect(response.body).toMatchObject({
        symbol: 'AAPL',
        price: 150.0,
        currency: 'USD',
        timestamp: expect.any(String),
      });
      expect(mockMarketDataService.getAssetPrice).toHaveBeenCalledWith('AAPL', 'USD');
    });

    it('should get asset price with custom currency', async () => {
      const mockPrice = { symbol: 'BTC', price: 40000.0, currency: 'EUR' };
      mockMarketDataService.getAssetPrice.mockResolvedValue(mockPrice);

      const response = await request(app.getHttpServer())
        .get('/market-data/asset-price')
        .query({ symbol: 'BTC', targetCurrency: 'EUR' })
        .expect(200);

      expect(response.body).toMatchObject({
        symbol: 'BTC',
        price: 40000.0,
        currency: 'EUR',
        timestamp: expect.any(String),
      });
      expect(mockMarketDataService.getAssetPrice).toHaveBeenCalledWith('BTC', 'EUR');
    });

    it('should return 400 when symbol is missing', async () => {
      await request(app.getHttpServer()).get('/market-data/asset-price').expect(400);

      expect(mockMarketDataService.getAssetPrice).not.toHaveBeenCalled();
    });

    it('should return 400 when symbol is empty', async () => {
      await request(app.getHttpServer())
        .get('/market-data/asset-price')
        .query({ symbol: '' })
        .expect(400);

      expect(mockMarketDataService.getAssetPrice).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockMarketDataService.getAssetPrice.mockRejectedValue(new Error('Price not found'));

      await request(app.getHttpServer())
        .get('/market-data/asset-price')
        .query({ symbol: 'INVALID' })
        .expect(500);

      expect(mockMarketDataService.getAssetPrice).toHaveBeenCalledWith('INVALID', 'USD');
    });
  });

  describe('/market-data/convert-currency (GET)', () => {
    it('should convert currency', async () => {
      mockMarketDataService.convertCurrency.mockResolvedValue(110.5);

      const response = await request(app.getHttpServer())
        .get('/market-data/convert-currency')
        .query({
          amount: 100,
          fromCurrency: 'EUR',
          toCurrency: 'USD',
        })
        .expect(200);

      expect(response.body).toEqual({ convertedAmount: 110.5 });
      expect(mockMarketDataService.convertCurrency).toHaveBeenCalledWith(100, 'EUR', 'USD');
    });

    it('should handle same currency conversion', async () => {
      mockMarketDataService.convertCurrency.mockResolvedValue(50);

      const response = await request(app.getHttpServer())
        .get('/market-data/convert-currency')
        .query({
          amount: 50,
          fromCurrency: 'USD',
          toCurrency: 'USD',
        })
        .expect(200);

      expect(response.body).toEqual({ convertedAmount: 50 });
      expect(mockMarketDataService.convertCurrency).toHaveBeenCalledWith(50, 'USD', 'USD');
    });

    it('should return 400 when amount is missing', async () => {
      await request(app.getHttpServer())
        .get('/market-data/convert-currency')
        .query({
          fromCurrency: 'EUR',
          toCurrency: 'USD',
        })
        .expect(400);

      expect(mockMarketDataService.convertCurrency).not.toHaveBeenCalled();
    });

    it('should return 400 when amount is negative', async () => {
      await request(app.getHttpServer())
        .get('/market-data/convert-currency')
        .query({
          amount: -100,
          fromCurrency: 'EUR',
          toCurrency: 'USD',
        })
        .expect(400);

      expect(mockMarketDataService.convertCurrency).not.toHaveBeenCalled();
    });

    it('should return 400 when fromCurrency is missing', async () => {
      await request(app.getHttpServer())
        .get('/market-data/convert-currency')
        .query({
          amount: 100,
          toCurrency: 'USD',
        })
        .expect(400);

      expect(mockMarketDataService.convertCurrency).not.toHaveBeenCalled();
    });

    it('should return 400 when toCurrency is missing', async () => {
      await request(app.getHttpServer())
        .get('/market-data/convert-currency')
        .query({
          amount: 100,
          fromCurrency: 'EUR',
        })
        .expect(400);

      expect(mockMarketDataService.convertCurrency).not.toHaveBeenCalled();
    });

    it('should handle service errors in currency conversion', async () => {
      mockMarketDataService.convertCurrency.mockRejectedValue(new Error('Invalid currency'));

      await request(app.getHttpServer())
        .get('/market-data/convert-currency')
        .query({
          amount: 100,
          fromCurrency: 'INVALID',
          toCurrency: 'USD',
        })
        .expect(500);

      expect(mockMarketDataService.convertCurrency).toHaveBeenCalledWith(100, 'INVALID', 'USD');
    });
  });
});
