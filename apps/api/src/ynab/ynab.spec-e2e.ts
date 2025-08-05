import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { beforeAll, describe, it, expect, afterAll, vi } from 'vitest';

import { SyncService } from '@/sync/sync.service';

import { YnabController } from './ynab.controller';
import { YnabService } from './ynab.service';

describe('/ynab (e2e)', () => {
  let app: INestApplication;
  let ynabService: YnabService;
  let syncService: SyncService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [YnabController],
      providers: [
        {
          provide: YnabService,
          useValue: {
            getAccounts: vi.fn(),
          },
        },
        {
          provide: SyncService,
          useValue: {
            triggerManualSync: vi.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');

    ynabService = moduleFixture.get<YnabService>(YnabService);
    syncService = moduleFixture.get<SyncService>(SyncService);

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/ynab/accounts', () => {
    it('should return YNAB accounts for valid token', async () => {
      const mockAccounts = [
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          name: 'Investment Account',
          type: 'investmentAccount',
          balance: 150000,
          currency: 'USD',
        },
        {
          id: 'b2c3d4e5-f6g7-8901-bcde-f23456789012',
          name: 'Checking Account',
          type: 'checking',
          balance: 50000,
          currency: 'USD',
        },
      ];

      vi.spyOn(ynabService, 'getAccounts').mockResolvedValue(mockAccounts);

      const response = await request(app.getHttpServer())
        .post('/api/ynab/accounts')
        .send({ token: 'valid-test-token' })
        .expect(201);

      expect(response.body).toEqual(mockAccounts);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Investment Account');
      expect(response.body[1].name).toBe('Checking Account');
      expect(ynabService.getAccounts).toHaveBeenCalledWith('valid-test-token');
    });

    it('should handle missing token', async () => {
      vi.spyOn(ynabService, 'getAccounts').mockResolvedValue([]);

      await request(app.getHttpServer()).post('/api/ynab/accounts').send({}).expect(201).expect([]);

      expect(ynabService.getAccounts).toHaveBeenCalledWith(undefined);
    });

    it('should handle invalid token', async () => {
      vi.spyOn(ynabService, 'getAccounts').mockRejectedValue(
        new Error('Failed to fetch YNAB accounts'),
      );

      await request(app.getHttpServer())
        .post('/api/ynab/accounts')
        .send({ token: 'invalid-token' })
        .expect(500);

      expect(ynabService.getAccounts).toHaveBeenCalledWith('invalid-token');
    });

    it('should handle empty accounts response', async () => {
      vi.spyOn(ynabService, 'getAccounts').mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .post('/api/ynab/accounts')
        .send({ token: 'empty-accounts-token' })
        .expect(201);

      expect(response.body).toEqual([]);
      expect(response.body).toHaveLength(0);
      expect(ynabService.getAccounts).toHaveBeenCalledWith('empty-accounts-token');
    });

    it('should validate request body structure', async () => {
      vi.spyOn(ynabService, 'getAccounts').mockResolvedValue([]);

      await request(app.getHttpServer())
        .post('/api/ynab/accounts')
        .send('invalid-json')
        .expect(201)
        .expect([]);

      expect(ynabService.getAccounts).toHaveBeenCalledWith(undefined);
    });

    it('should handle YNAB service errors', async () => {
      vi.spyOn(ynabService, 'getAccounts').mockRejectedValue(new Error('YNAB API is down'));

      await request(app.getHttpServer())
        .post('/api/ynab/accounts')
        .send({ token: 'valid-token' })
        .expect(500);

      expect(ynabService.getAccounts).toHaveBeenCalledWith('valid-token');
    });
  });

  describe('POST /api/ynab/sync', () => {
    it('should trigger manual sync successfully', async () => {
      vi.spyOn(syncService, 'triggerManualSync').mockResolvedValue(undefined);

      const response = await request(app.getHttpServer()).post('/api/ynab/sync').expect(201);

      expect(response.body).toEqual({ message: 'Sync completed successfully' });
      expect(syncService.triggerManualSync).toHaveBeenCalledWith();
    });

    it('should handle sync service errors', async () => {
      vi.spyOn(syncService, 'triggerManualSync').mockRejectedValue(
        new Error('Sync configuration invalid'),
      );

      await request(app.getHttpServer()).post('/api/ynab/sync').expect(500);

      expect(syncService.triggerManualSync).toHaveBeenCalledWith();
    });

    it('should handle sync service timeout errors', async () => {
      vi.spyOn(syncService, 'triggerManualSync').mockRejectedValue(new Error('Request timeout'));

      await request(app.getHttpServer()).post('/api/ynab/sync').expect(500);

      expect(syncService.triggerManualSync).toHaveBeenCalledWith();
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent ynab routes', async () => {
      await request(app.getHttpServer()).get('/api/ynab/non-existent').expect(404);
    });

    it('should handle invalid methods on ynab routes', async () => {
      await request(app.getHttpServer()).get('/api/ynab/accounts').expect(404);

      await request(app.getHttpServer()).put('/api/ynab/sync').expect(404);

      await request(app.getHttpServer()).delete('/api/ynab/accounts').expect(404);
    });

    it('should handle malformed request bodies', async () => {
      await request(app.getHttpServer())
        .post('/api/ynab/accounts')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });
  });
});
