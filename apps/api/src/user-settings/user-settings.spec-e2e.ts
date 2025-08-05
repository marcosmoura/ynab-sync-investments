import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { SyncSchedule } from '@/shared/entities';

import { UserSettingsController } from './user-settings.controller';
import { UserSettingsService } from './user-settings.service';

describe('UserSettingsController (e2e)', () => {
  let app: INestApplication;
  let userSettingsService: UserSettingsService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UserSettingsController],
      providers: [
        {
          provide: UserSettingsService,
          useValue: {
            create: vi.fn(),
            findSettings: vi.fn(),
            update: vi.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    userSettingsService = moduleFixture.get<UserSettingsService>(UserSettingsService);
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/settings', () => {
    it('should create user settings successfully', async () => {
      const createDto = {
        ynabApiToken: 'test-token-123',
        syncSchedule: SyncSchedule.DAILY,
      };
      const responseDto = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ynabApiToken: 'test-token-123',
        syncSchedule: SyncSchedule.DAILY,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(userSettingsService, 'create').mockResolvedValue(responseDto);

      const response = await request(app.getHttpServer())
        .post('/api/settings')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: '123e4567-e89b-12d3-a456-426614174000',
        ynabApiToken: 'test-token-123',
        syncSchedule: SyncSchedule.DAILY,
      });
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();

      expect(userSettingsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should handle validation errors for missing fields', async () => {
      await request(app.getHttpServer()).post('/api/settings').send({}).expect(400);
    });

    it('should handle validation errors for invalid sync schedule', async () => {
      await request(app.getHttpServer())
        .post('/api/settings')
        .send({
          ynabApiToken: 'test-token-123',
          syncSchedule: 'invalid-schedule',
        })
        .expect(400);
    });

    it('should handle service errors during creation', async () => {
      const createDto = {
        ynabApiToken: 'test-token-123',
        syncSchedule: SyncSchedule.DAILY,
      };

      vi.spyOn(userSettingsService, 'create').mockRejectedValue(
        new Error('User settings already exist'),
      );

      await request(app.getHttpServer()).post('/api/settings').send(createDto).expect(500);

      expect(userSettingsService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('GET /api/settings', () => {
    it('should retrieve user settings successfully', async () => {
      const responseDto = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ynabApiToken: 'test-token-123',
        syncSchedule: SyncSchedule.DAILY,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(userSettingsService, 'findSettings').mockResolvedValue(responseDto);

      const response = await request(app.getHttpServer()).get('/api/settings').expect(200);

      expect(response.body).toMatchObject({
        id: '123e4567-e89b-12d3-a456-426614174000',
        ynabApiToken: 'test-token-123',
        syncSchedule: SyncSchedule.DAILY,
      });
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();

      expect(userSettingsService.findSettings).toHaveBeenCalled();
    });

    it('should return null when no settings exist', async () => {
      vi.spyOn(userSettingsService, 'findSettings').mockResolvedValue(null);

      const response = await request(app.getHttpServer()).get('/api/settings').expect(200);

      expect(response.body).toEqual({});
      expect(userSettingsService.findSettings).toHaveBeenCalled();
    });

    it('should handle service errors during retrieval', async () => {
      vi.spyOn(userSettingsService, 'findSettings').mockRejectedValue(
        new Error('Database connection failed'),
      );

      await request(app.getHttpServer()).get('/api/settings').expect(500);

      expect(userSettingsService.findSettings).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/settings', () => {
    it('should update user settings successfully', async () => {
      const updateDto = {
        syncSchedule: SyncSchedule.WEEKLY,
      };
      const responseDto = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ynabApiToken: 'test-token-123',
        syncSchedule: SyncSchedule.WEEKLY,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(userSettingsService, 'update').mockResolvedValue(responseDto);

      const response = await request(app.getHttpServer())
        .patch('/api/settings')
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: '123e4567-e89b-12d3-a456-426614174000',
        ynabApiToken: 'test-token-123',
        syncSchedule: SyncSchedule.WEEKLY,
      });
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();

      expect(userSettingsService.update).toHaveBeenCalledWith(updateDto);
    });

    it('should handle validation errors for invalid sync schedule', async () => {
      await request(app.getHttpServer())
        .patch('/api/settings')
        .send({
          syncSchedule: 'invalid-schedule',
        })
        .expect(400);
    });

    it('should handle service errors during update', async () => {
      const updateDto = {
        syncSchedule: SyncSchedule.WEEKLY,
      };

      vi.spyOn(userSettingsService, 'update').mockRejectedValue(
        new Error('User settings not found'),
      );

      await request(app.getHttpServer()).patch('/api/settings').send(updateDto).expect(500);

      expect(userSettingsService.update).toHaveBeenCalledWith(updateDto);
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent settings routes', async () => {
      await request(app.getHttpServer()).get('/api/settings/non-existent').expect(404);
    });

    it('should handle invalid methods on settings routes', async () => {
      await request(app.getHttpServer()).delete('/api/settings').expect(404);
    });

    it('should handle malformed request bodies', async () => {
      await request(app.getHttpServer()).post('/api/settings').send('invalid-json').expect(400);
    });
  });
});
