import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { AssetService } from '@/asset/asset.service';
import { MarketDataService } from '@/market-data/market-data.service';
import { UserSettingsService } from '@/user-settings/user-settings.service';
import { YnabService } from '@/ynab/ynab.service';

import { SyncService } from './sync.service';

describe('SyncController', () => {
  let service: SyncService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: AssetService,
          useValue: createMock<AssetService>(),
        },
        {
          provide: UserSettingsService,
          useValue: createMock<UserSettingsService>(),
        },
        {
          provide: YnabService,
          useValue: createMock<YnabService>(),
        },
        {
          provide: MarketDataService,
          useValue: createMock<MarketDataService>(),
        },
      ],
    }).compile();

    service = moduleRef.get(SyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
