import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

import { DocumentationService } from './documentation.service';

@Controller()
export class DocumentationController {
  constructor(private readonly documentationService: DocumentationService) {}

  @ApiExcludeEndpoint()
  @Get('/docs')
  @Header('Content-Type', 'text/html')
  getDocumentation() {
    return this.documentationService.generateScalarHTML();
  }

  @ApiExcludeEndpoint()
  @Get('/docs/openapi.json')
  getOpenApiSpec() {
    return this.documentationService.getOpenApiSpec();
  }
}
