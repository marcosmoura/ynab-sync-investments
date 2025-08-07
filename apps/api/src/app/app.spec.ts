import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { FileSyncService } from '@/file-sync/file-sync.service';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: FileSyncService,
          useValue: {
            triggerManualFileSync: vi.fn(),
            getCachedConfig: vi.fn(),
          },
        },
      ],
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
        endpoints: {
          'GET /sync': 'To perform a manual file sync',
        },
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
        endpoints: {
          'GET /sync': 'To perform a manual file sync',
        },
      };
      vi.spyOn(appService, 'getData').mockReturnValue(expectedData);

      const result = controller.getData();

      expect(result).toEqual(expectedData);
    });
  });

  describe('triggerFileSync', () => {
    it('should trigger manual file sync successfully', async () => {
      const expectedResult = { message: 'File sync completed successfully' };
      vi.spyOn(appService, 'triggerFileSync').mockResolvedValue(expectedResult);

      const result = await controller.triggerFileSync();

      expect(appService.triggerFileSync).toHaveBeenCalledOnce();
      expect(result).toEqual(expectedResult);
    });

    it('should handle file sync errors', async () => {
      const error = new Error('Sync failed');
      vi.spyOn(appService, 'triggerFileSync').mockRejectedValue(error);

      await expect(controller.triggerFileSync()).rejects.toThrow('Sync failed');
      expect(appService.triggerFileSync).toHaveBeenCalledOnce();
    });
  });
});

describe('AppService', () => {
  let service: AppService;
  let fileSyncService: FileSyncService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: FileSyncService,
          useValue: {
            triggerManualFileSync: vi.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AppService);
    fileSyncService = moduleRef.get(FileSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getData', () => {
    it('should return correct application data', () => {
      const result = service.getData();

      expect(result).toEqual({
        message: 'YNAB Investments Sync API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          'GET /sync': 'To perform a manual file sync',
        },
      });
    });
  });

  describe('triggerFileSync', () => {
    it('should trigger manual file sync successfully', async () => {
      vi.mocked(fileSyncService.triggerManualFileSync).mockResolvedValue();

      const result = await service.triggerFileSync();

      expect(fileSyncService.triggerManualFileSync).toHaveBeenCalledOnce();
      expect(result).toEqual({ message: 'File sync completed successfully' });
    });

    it('should handle file sync errors', async () => {
      const error = new Error('Sync failed');
      vi.mocked(fileSyncService.triggerManualFileSync).mockRejectedValue(error);

      await expect(service.triggerFileSync()).rejects.toThrow('Sync failed');
      expect(fileSyncService.triggerManualFileSync).toHaveBeenCalledOnce();
    });
  });
});
