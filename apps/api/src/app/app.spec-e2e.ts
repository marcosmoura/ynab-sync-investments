import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { describe, it, afterAll, expect, beforeAll, beforeEach, vi } from 'vitest';

import { FileSyncService } from '@/file-sync/file-sync.service';
import { MarketDataService } from '@/market-data/market-data.service';
import { YnabService } from '@/ynab/ynab.service';

import { AppModule } from './app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  // Mock services to avoid external API calls
  const mockFileSyncService = {
    triggerManualFileSync: vi.fn().mockResolvedValue(undefined),
    fetchAndCacheConfig: vi.fn().mockResolvedValue(undefined),
    handleScheduledConfigFetch: vi.fn().mockResolvedValue(undefined),
    handleWeeklyYnabSync: vi.fn().mockResolvedValue(undefined),
  };

  const mockMarketDataService = {
    getPrice: vi.fn().mockResolvedValue({ price: 100, currency: 'USD' }),
    getSupportedSymbols: vi.fn().mockResolvedValue(['AAPL', 'GOOGL']),
  };

  const mockYnabService = {
    updateAccountBalance: vi.fn().mockResolvedValue(undefined),
    getAccounts: vi.fn().mockResolvedValue([]),
    getBudgets: vi.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FileSyncService)
      .useValue(mockFileSyncService)
      .overrideProvider(MarketDataService)
      .useValue(mockMarketDataService)
      .overrideProvider(YnabService)
      .useValue(mockYnabService)
      .compile();

    app = moduleFixture.createNestApplication({
      logger: false, // Disable NestJS logging for tests
    });
    app.setGlobalPrefix('api'); // Set the same global prefix as in main.ts
    await app.init();
  });

  beforeEach(() => {
    // Reset mock call counts before each test
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    // Clear all mocks after tests
    vi.clearAllMocks();
  });

  describe('Valid endpoints', () => {
    it('/ (GET)', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect({
          message: 'YNAB Investments Sync API',
          version: '1.0.0',
          status: 'running',
          endpoints: {
            'GET /sync': 'To perform a manual file sync',
          },
        });
    });

    it('/sync (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/sync')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toBe('File sync completed successfully');
          // Verify that the mocked service was called
          expect(mockFileSyncService.triggerManualFileSync).toHaveBeenCalledTimes(1);
        });
    });
  });

  describe('Invalid endpoints', () => {
    it('/invalid-route (GET)', () => {
      return request(app.getHttpServer()).get('/api/invalid-route').expect(404).expect({
        statusCode: 404,
        message: 'Cannot GET /api/invalid-route',
        error: 'Not Found',
      });
    });
  });
});
