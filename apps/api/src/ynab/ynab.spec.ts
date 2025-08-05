import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { SyncService } from '@/sync/sync.service';

import { YnabController } from './ynab.controller';
import { YnabService } from './ynab.service';

describe('YnabController', () => {
  let controller: YnabController;
  let service: YnabService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [YnabController],
      providers: [
        {
          provide: YnabService,
          useValue: createMock<YnabService>(),
        },
        {
          provide: SyncService,
          useValue: createMock<SyncService>(),
        },
      ],
    }).compile();

    service = moduleRef.get(YnabService);
    controller = moduleRef.get(YnabController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });
});
