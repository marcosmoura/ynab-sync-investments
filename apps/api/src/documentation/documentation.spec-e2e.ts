import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { beforeAll, describe, it, expect, afterAll } from 'vitest';

import { DocumentationModule } from './documentation.module';
import { DocumentationService } from './documentation.service';

describe('/docs (e2e)', () => {
  let app: INestApplication;
  let documentationService: DocumentationService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [DocumentationModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');

    documentationService = moduleFixture.get<DocumentationService>(DocumentationService);

    // Generate the documentation for testing
    await documentationService.generateDocumentation(app);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/docs', () => {
    it('should return HTML documentation page', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs').expect(200);

      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('<!doctype html>');
      expect(response.text).toContain('YNAB Investments Sync API Documentation');
      expect(response.text).toContain('@scalar/api-reference');
      expect(response.text).toContain('data-url="/api/docs/openapi.json"');
    });

    it('should include proper Scalar configuration', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs').expect(200);

      expect(response.text).toContain('"theme":"kepler"');
      expect(response.text).toContain('"layout":"modern"');
      expect(response.text).toContain('"showSidebar":true');
      expect(response.text).toContain('"hideDownloadButton":false');
      expect(response.text).toContain('"darkMode":true');
    });

    it('should have valid HTML structure', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs').expect(200);

      const html = response.text;
      expect(html).toMatch(/^<!doctype html>/);
      expect(html).toContain('<html>');
      expect(html).toContain('<head>');
      expect(html).toContain('<title>');
      expect(html).toContain('</title>');
      expect(html).toContain('</head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</body>');
      expect(html).toContain('</html>');
    });
  });

  describe('GET /api/docs/openapi.json', () => {
    it('should return OpenAPI specification as JSON', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs/openapi.json').expect(200);

      expect(response.headers['content-type']).toContain('application/json');

      const spec = response.body;
      expect(spec).toHaveProperty('openapi');
      expect(spec).toHaveProperty('info');
      expect(spec).toHaveProperty('paths');
    });

    it('should have proper API information', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs/openapi.json').expect(200);

      const spec = response.body;
      expect(spec.info).toHaveProperty('title');
      expect(spec.info).toHaveProperty('description');
      expect(spec.info).toHaveProperty('version');
      expect(typeof spec.info.title).toBe('string');
      expect(typeof spec.info.description).toBe('string');
      expect(typeof spec.info.version).toBe('string');
    });

    it('should include API tags for different modules', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs/openapi.json').expect(200);

      const spec = response.body;
      expect(spec).toHaveProperty('tags');
      expect(Array.isArray(spec.tags)).toBe(true);

      const tagNames = spec.tags.map((tag: { name: string }) => tag.name);
      expect(tagNames).toContain('assets');
      expect(tagNames).toContain('market-data');
      expect(tagNames).toContain('sync');
      expect(tagNames).toContain('user-settings');
      expect(tagNames).toContain('ynab');
    });

    it('should have valid OpenAPI version', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs/openapi.json').expect(200);

      const spec = response.body;
      expect(spec.openapi).toMatch(/^3\.\d+\.\d+$/);
    });

    it('should return the same specification as the service method', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs/openapi.json').expect(200);

      const serviceSpec = documentationService.getOpenApiSpec();
      expect(response.body).toEqual(serviceSpec);
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent documentation routes', async () => {
      await request(app.getHttpServer()).get('/api/docs/non-existent').expect(404);
    });

    it('should handle invalid methods on documentation routes', async () => {
      await request(app.getHttpServer()).post('/api/docs').expect(404);

      await request(app.getHttpServer()).put('/api/docs/openapi.json').expect(404);

      await request(app.getHttpServer()).delete('/api/docs').expect(404);
    });
  });
});
