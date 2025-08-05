import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

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

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });
});
