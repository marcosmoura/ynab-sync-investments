import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { describe, it, afterAll, expect, beforeAll } from 'vitest';

import { AppModule } from './app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({
      logger: false, // Disable NestJS logging for tests
    });
    app.setGlobalPrefix('api'); // Set the same global prefix as in main.ts
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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
