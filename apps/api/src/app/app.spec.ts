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
    expect(appService).toBeDefined();
  });

  describe('getData', () => {
    it('should return correct application data', () => {
      const result = controller.getData();

      expect(result).toEqual({
        message: 'YNAB Investments Sync API',
        version: '1.0.0',
        status: 'running',
        documentation: '/api/docs',
      });
    });

    it('should call appService.getData', () => {
      const spy = vi.spyOn(appService, 'getData');

      controller.getData();

      expect(spy).toHaveBeenCalledOnce();
    });

    it('should return data from service', () => {
      const expectedData = {
        message: 'Test Message',
        version: '2.0.0',
        status: 'test',
        documentation: '/test/docs',
      };
      vi.spyOn(appService, 'getData').mockReturnValue(expectedData);

      const result = controller.getData();

      expect(result).toEqual(expectedData);
    });
  });
});
