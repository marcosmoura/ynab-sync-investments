import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, it, expect, beforeEach } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';

import { Asset } from '@/shared/entities';

import { AssetService } from './asset.service';
import { AssetController } from './asset.controller';

describe('AssetController', () => {
  let controller: AssetController;
  let service: AssetService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AssetController],
      providers: [
        AssetService,
        {
          provide: getRepositoryToken(Asset),
          useValue: createMock<AssetService>(),
        },
      ],
    }).compile();

    service = moduleRef.get(AssetService);
    controller = moduleRef.get(AssetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });
});
