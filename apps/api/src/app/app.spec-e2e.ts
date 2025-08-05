import request from 'supertest';
import { Test } from '@nestjs/testing';
import { describe, it, beforeEach, afterAll } from 'vitest';

import { AppModule } from './app.module';

describe('AppController (e2e)', () => {
  let app;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api'); // Set the same global prefix as in main.ts
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/api').expect(200).expect({});
  });
});
