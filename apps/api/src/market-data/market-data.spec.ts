import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';

describe('MarketDataController', () => {
  let controller: MarketDataController;
  let service: MarketDataService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MarketDataController],
      providers: [MarketDataService],
    }).compile();

    service = moduleRef.get(MarketDataService);
    controller = moduleRef.get(MarketDataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });
});
