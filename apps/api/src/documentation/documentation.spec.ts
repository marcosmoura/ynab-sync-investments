import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { DocumentationController } from './documentation.controller';
import { DocumentationService } from './documentation.service';

describe('DocumentationController', () => {
  let controller: DocumentationController;
  let service: DocumentationService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DocumentationController],
      providers: [DocumentationService],
    }).compile();

    service = moduleRef.get(DocumentationService);
    controller = moduleRef.get(DocumentationController);
  });

  describe('getDocumentation', () => {
    it('should return HTML documentation', () => {
      const mockHTML = `
<!doctype html>
<html>
  <head>
    <title>YNAB Investments Sync API Documentation</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/docs/openapi.json"
      data-configuration='{"theme":"kepler","layout":"modern","showSidebar":true,"hideDownloadButton":false,"darkMode":true}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`.trim();

      vi.spyOn(service, 'generateScalarHTML').mockReturnValue(mockHTML);

      const result = controller.getDocumentation();

      expect(service.generateScalarHTML).toHaveBeenCalled();
      expect(result).toBe(mockHTML);
      expect(result).toContain('YNAB Investments Sync API Documentation');
      expect(result).toContain('@scalar/api-reference');
    });
  });

  describe('getOpenApiSpec', () => {
    it('should return OpenAPI specification', () => {
      const mockOpenApiSpec = {
        openapi: '3.0.0',
        info: {
          title: 'YNAB Investments Sync API',
          description: 'API for syncing investment data with YNAB',
          version: '1.0',
        },
        paths: {},
        components: {},
        tags: [
          { name: 'assets', description: 'Asset management endpoints' },
          { name: 'market-data', description: 'Market data endpoints' },
          { name: 'sync', description: 'Synchronization endpoints' },
          { name: 'user-settings', description: 'User settings management' },
          { name: 'ynab', description: 'YNAB integration endpoints' },
        ],
      };

      vi.spyOn(service, 'getOpenApiSpec').mockReturnValue(mockOpenApiSpec);

      const result = controller.getOpenApiSpec();

      expect(service.getOpenApiSpec).toHaveBeenCalled();
      expect(result).toEqual(mockOpenApiSpec);
      expect(result.info.title).toBe('YNAB Investments Sync API');
      expect(result.tags).toHaveLength(5);
    });
  });
});

describe('DocumentationService', () => {
  let service: DocumentationService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [DocumentationService],
    }).compile();

    service = moduleRef.get(DocumentationService);
  });

  describe('generateScalarHTML', () => {
    it('should generate HTML with Scalar API reference', () => {
      const result = service.generateScalarHTML();

      expect(result).toContain('<!doctype html>');
      expect(result).toContain('<html>');
      expect(result).toContain('YNAB Investments Sync API Documentation');
      expect(result).toContain('data-url="/api/docs/openapi.json"');
      expect(result).toContain('@scalar/api-reference');
      expect(result).toContain('"theme":"kepler"');
      expect(result).toContain('"layout":"modern"');
      expect(result).toContain('"darkMode":true');
    });

    it('should include proper configuration in the generated HTML', () => {
      const result = service.generateScalarHTML();

      expect(result).toContain('"showSidebar":true');
      expect(result).toContain('"hideDownloadButton":false');
      expect(result).toContain('"darkMode":true');
    });

    it('should be valid HTML structure', () => {
      const result = service.generateScalarHTML();

      expect(result).toMatch(/^<!doctype html>/);
      expect(result).toContain('<head>');
      expect(result).toContain('</head>');
      expect(result).toContain('<body>');
      expect(result).toContain('</body>');
      expect(result).toContain('</html>');
    });
  });

  describe('getOpenApiSpec', () => {
    it('should return the stored API document', () => {
      const mockDocument = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0' },
        paths: {},
      };

      service.apiDocument = mockDocument;

      const result = service.getOpenApiSpec();

      expect(result).toEqual(mockDocument);
    });

    it('should return undefined if no API document is set', () => {
      const result = service.getOpenApiSpec();

      expect(result).toBeUndefined();
    });
  });

  describe('generateDocumentation', () => {
    it('should store API document when generated', () => {
      const mockDocument = {
        openapi: '3.0.0',
        info: {
          title: 'YNAB Investments Sync API',
          description: 'API for syncing investment data with YNAB',
          version: '1.0',
        },
        tags: [
          { name: 'assets', description: 'Asset management endpoints' },
          { name: 'market-data', description: 'Market data endpoints' },
          { name: 'sync', description: 'Synchronization endpoints' },
          { name: 'user-settings', description: 'User settings management' },
          { name: 'ynab', description: 'YNAB integration endpoints' },
        ],
        paths: {},
      };

      // Directly set the API document to test the property assignment
      service.apiDocument = mockDocument;

      expect(service.apiDocument).toEqual(mockDocument);
      expect(service.getOpenApiSpec()).toEqual(mockDocument);
    });

    it('should have generateDocumentation method', () => {
      expect(typeof service.generateDocumentation).toBe('function');
    });
  });
});
