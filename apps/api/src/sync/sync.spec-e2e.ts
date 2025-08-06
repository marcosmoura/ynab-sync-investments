import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

describe('SyncController (e2e)', () => {
  let app: INestApplication;
  let syncService: SyncService;

  beforeEach(async () => {
    const mockSyncService = {
      triggerManualSync: vi.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        {
          provide: SyncService,
          useValue: mockSyncService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication({
      logger: false, // Disable NestJS logging for tests
    });
    syncService = moduleFixture.get<SyncService>(SyncService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /sync/manual', () => {
    it('should trigger manual sync successfully', async () => {
      // Arrange
      vi.mocked(syncService.triggerManualSync).mockResolvedValue();

      // Act
      const response = await request(app.getHttpServer())
        .post('/sync/manual')
        .expect(HttpStatus.OK);

      // Assert
      expect(response.body).toEqual({
        message: 'Manual sync completed successfully',
      });
      expect(syncService.triggerManualSync).toHaveBeenCalledTimes(1);
    });

    it('should return 500 when sync service fails', async () => {
      // Arrange
      vi.mocked(syncService.triggerManualSync).mockRejectedValue(
        new Error('User settings not found'),
      );

      // Act & Assert
      await request(app.getHttpServer())
        .post('/sync/manual')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(syncService.triggerManualSync).toHaveBeenCalledTimes(1);
    });
  });
});
