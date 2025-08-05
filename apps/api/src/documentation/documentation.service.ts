import { INestApplication, Injectable } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

@Injectable()
export class DocumentationService {
  apiDocument: OpenAPIObject;

  public async generateDocumentation(app: INestApplication) {
    const config = new DocumentBuilder()
      .setTitle('YNAB Investments Sync API')
      .setDescription('API for syncing investment data with YNAB')
      .setVersion('1.0')
      .addTag('assets', 'Asset management endpoints')
      .addTag('market-data', 'Market data endpoints')
      .addTag('sync', 'Synchronization endpoints')
      .addTag('user-settings', 'User settings management')
      .addTag('ynab', 'YNAB integration endpoints')
      .build();

    this.apiDocument = await SwaggerModule.createDocument(app, config);
  }

  getOpenApiSpec(): OpenAPIObject {
    return this.apiDocument;
  }

  generateScalarHTML(): string {
    const config = {
      theme: 'kepler',
      layout: 'modern',
      showSidebar: true,
      hideDownloadButton: false,
      darkMode: true,
    };

    return `
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
      data-configuration='${JSON.stringify(config)}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
  `.trim();
  }
}
