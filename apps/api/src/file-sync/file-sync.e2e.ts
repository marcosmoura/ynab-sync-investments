import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { FileSyncController } from './file-sync.controller';
import { FileSyncService } from './file-sync.service';

describe('FileSyncController', () => {
  let controller: FileSyncController;
  let fileSyncService: FileSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileSyncController],
      providers: [
        {
          provide: FileSyncService,
          useValue: {
            triggerManualFileSync: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FileSyncController>(FileSyncController);
    fileSyncService = module.get<FileSyncService>(FileSyncService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('triggerFileSync', () => {
    it('should trigger manual file sync successfully', async () => {
      vi.mocked(fileSyncService.triggerManualFileSync).mockResolvedValue();

      const result = await controller.triggerFileSync();

      expect(fileSyncService.triggerManualFileSync).toHaveBeenCalled();
      expect(result).toEqual({ message: 'File sync completed successfully' });
    });

    it('should handle errors during file sync', async () => {
      const error = new Error('File sync failed');
      vi.mocked(fileSyncService.triggerManualFileSync).mockRejectedValue(error);

      await expect(controller.triggerFileSync()).rejects.toThrow('File sync failed');
    });
  });
});
