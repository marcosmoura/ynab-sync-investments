import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appService = moduleRef.get(AppService);
    controller = moduleRef.get(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getData', () => {
    it('should return data from service', async () => {
      const expectedData = {
        message: 'YNAB Investments Sync API',
        version: '1.0.0',
        status: 'running',
        documentation: '/api/docs',
      };
      vi.spyOn(appService, 'getData').mockReturnValue(expectedData);

      expect(await controller.getData()).toBe(expectedData);
      expect(appService.getData).toHaveBeenCalled();
    });
  });
});
