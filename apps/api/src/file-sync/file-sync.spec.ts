import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { AssetService } from '@/asset/asset.service';
import { Asset, SyncSchedule } from '@/database/entities';
import { SyncService } from '@/sync/sync.service';
import { UserSettingsService } from '@/user-settings/user-settings.service';

import { FileSyncService } from './file-sync.service';

// Mock the global fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FileSyncService', () => {
  let service: FileSyncService;
  let configService: ConfigService;
  let userSettingsService: UserSettingsService;
  let syncService: SyncService;
  let assetRepository: Repository<Asset>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileSyncService,
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>(),
        },
        {
          provide: AssetService,
          useValue: createMock<AssetService>(),
        },
        {
          provide: UserSettingsService,
          useValue: createMock<UserSettingsService>(),
        },
        {
          provide: SyncService,
          useValue: createMock<SyncService>(),
        },
        {
          provide: getRepositoryToken(Asset),
          useValue: createMock<Repository<Asset>>(),
        },
      ],
    }).compile();

    service = module.get<FileSyncService>(FileSyncService);
    configService = module.get(ConfigService);
    userSettingsService = module.get(UserSettingsService);
    syncService = module.get(SyncService);
    assetRepository = module.get(getRepositoryToken(Asset));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processConfigFile', () => {
    const mockYamlConfig = `
budget: "test-budget-id"
accounts:
  - account_id: "account-1"
    holdings:
      AAPL: 10
      MSFT: 5
  - account_id: "account-2"
    holdings:
      BTC: 1.5
      ETH: 10
`;

    beforeEach(() => {
      vi.mocked(configService.get).mockReturnValue('https://example.com/config.yaml');
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockYamlConfig),
      });
      vi.mocked(assetRepository.delete).mockResolvedValue({ affected: 1, raw: {} });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(assetRepository.save).mockResolvedValue([] as any);
      vi.mocked(syncService.triggerManualSync).mockResolvedValue();
    });

    it('should process config file successfully', async () => {
      await service.processConfigFile();

      expect(configService.get).toHaveBeenCalledWith('INVESTMENTS_CONFIG_FILE_URL');
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/config.yaml');
      expect(assetRepository.delete).toHaveBeenCalledTimes(2);
      expect(assetRepository.save).toHaveBeenCalledTimes(2);
      expect(syncService.triggerManualSync).toHaveBeenCalled();
    });

    it('should handle missing config file URL', async () => {
      vi.mocked(configService.get).mockReturnValue(undefined);

      await service.processConfigFile();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(syncService.triggerManualSync).not.toHaveBeenCalled();
    });

    it('should handle fetch failure', async () => {
      vi.mocked(configService.get).mockReturnValue('https://example.com/config.yaml');
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await service.processConfigFile();

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/config.yaml');
      expect(syncService.triggerManualSync).not.toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      vi.mocked(configService.get).mockReturnValue('https://example.com/config.yaml');
      mockFetch.mockRejectedValue(new Error('Network error'));

      await service.processConfigFile();

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/config.yaml');
      expect(syncService.triggerManualSync).not.toHaveBeenCalled();
    });

    it('should handle invalid YAML format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('invalid: yaml: content:'),
      });

      await expect(service.processConfigFile()).rejects.toThrow();
    });
  });

  describe('handleScheduledFileSync', () => {
    it('should run sync when no settings exist', async () => {
      vi.mocked(userSettingsService.findSettings).mockResolvedValue(null);
      const processConfigFileSpy = vi.spyOn(service, 'processConfigFile').mockResolvedValue();

      await service.handleScheduledFileSync();

      expect(processConfigFileSpy).toHaveBeenCalled();
    });

    it('should run sync when schedule permits', async () => {
      const mockSettings = {
        id: '1',
        ynabApiToken: 'token',
        syncSchedule: SyncSchedule.DAILY,
        targetBudgetId: 'budget-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(userSettingsService.findSettings).mockResolvedValue(mockSettings);
      vi.mocked(syncService.shouldSync).mockReturnValue(true);
      const processConfigFileSpy = vi.spyOn(service, 'processConfigFile').mockResolvedValue();

      await service.handleScheduledFileSync();

      expect(processConfigFileSpy).toHaveBeenCalled();
    });

    it('should skip sync when schedule does not permit', async () => {
      const mockSettings = {
        id: '1',
        ynabApiToken: 'token',
        syncSchedule: SyncSchedule.DAILY,
        targetBudgetId: 'budget-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(userSettingsService.findSettings).mockResolvedValue(mockSettings);
      vi.mocked(syncService.shouldSync).mockReturnValue(false);
      const processConfigFileSpy = vi.spyOn(service, 'processConfigFile').mockResolvedValue();

      await service.handleScheduledFileSync();

      expect(processConfigFileSpy).not.toHaveBeenCalled();
    });
  });
});
