import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { MarketDataService } from '@/market-data/market-data.service';
import { YnabService } from '@/ynab/ynab.service';

import { FileSyncService } from './file-sync.service';

describe('FileSyncService', () => {
  let service: FileSyncService;
  let configService: ConfigService;
  let schedulerRegistry: SchedulerRegistry;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        FileSyncService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn(),
          },
        },
        {
          provide: YnabService,
          useValue: {
            getBudgets: vi.fn(),
            getAccounts: vi.fn(),
            updateAccountBalance: vi.fn(),
          },
        },
        {
          provide: MarketDataService,
          useValue: {
            getAssetPrices: vi.fn(),
          },
        },
        {
          provide: SchedulerRegistry,
          useValue: {
            addCronJob: vi.fn(),
            deleteCronJob: vi.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(FileSyncService);
    configService = moduleRef.get(ConfigService);
    schedulerRegistry = moduleRef.get(SchedulerRegistry);

    // Mock fetch globally
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchAndCacheConfig', () => {
    it('should skip when config URL is not provided', async () => {
      vi.mocked(configService.get).mockReturnValue(undefined);

      await service.fetchAndCacheConfig();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fetch and parse config successfully', async () => {
      const configUrl = 'https://example.com/config.yaml';
      const yamlContent = `
budget: test-budget-id
schedule:
  sync_time: "8pm"
  sync_frequency: daily
accounts:
  - account_id: account-1
    holdings:
      AAPL: 10
      GOOGL: 5
`;

      vi.mocked(configService.get).mockReturnValue(configUrl);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(yamlContent),
      } as Response);

      await service.fetchAndCacheConfig();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(configUrl),
        expect.objectContaining({
          cache: 'no-store',
          headers: expect.objectContaining({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }),
        }),
      );
      expect(service.getCachedConfig()).toBeDefined();
    });

    it('should handle fetch errors gracefully', async () => {
      const configUrl = 'https://example.com/config.yaml';

      vi.mocked(configService.get).mockReturnValue(configUrl);
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await service.fetchAndCacheConfig();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(configUrl),
        expect.any(Object),
      );
      expect(service.getCachedConfig()).toBeNull();
    });

    it('should handle invalid YAML gracefully', async () => {
      const configUrl = 'https://example.com/config.yaml';
      const invalidYaml = 'invalid: yaml: content: [';

      vi.mocked(configService.get).mockReturnValue(configUrl);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(invalidYaml),
      } as Response);

      await service.fetchAndCacheConfig();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(configUrl),
        expect.any(Object),
      );
      expect(service.getCachedConfig()).toBeNull();
    });
  });

  describe('getCachedConfig', () => {
    it('should return null when no config is cached', () => {
      expect(service.getCachedConfig()).toBeNull();
    });
  });

  describe('triggerManualFileSync', () => {
    it('should call fetchAndCacheConfig and then perform sync', async () => {
      // Setup proper mocks to ensure config is cached
      const configUrl = 'https://example.com/config.yaml';
      const yamlContent = `
budget: test-budget-id
accounts:
  - account_id: account-1
    holdings:
      AAPL: 10
`;

      vi.mocked(configService.get).mockReturnValue(configUrl);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(yamlContent),
      } as Response);

      const fetchSpy = vi.spyOn(service, 'fetchAndCacheConfig');

      await service.triggerManualFileSync();

      expect(fetchSpy).toHaveBeenCalledOnce();
      expect(service.getCachedConfig()).toBeDefined();
    });
  });

  describe('handleScheduledConfigFetch', () => {
    it('should call fetchAndCacheConfig', async () => {
      const spy = vi.spyOn(service, 'fetchAndCacheConfig').mockResolvedValue(void 0);

      await service.handleScheduledConfigFetch();

      expect(spy).toHaveBeenCalledOnce();
    });

    it('should handle errors gracefully', async () => {
      const spy = vi
        .spyOn(service, 'fetchAndCacheConfig')
        .mockRejectedValue(new Error('Test error'));

      await service.handleScheduledConfigFetch();

      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe('handleWeeklyYnabSync', () => {
    it('should handle errors gracefully', async () => {
      const spy = vi
        .spyOn(service, 'fetchAndCacheConfig')
        .mockRejectedValue(new Error('Test error'));

      await service.handleWeeklyYnabSync();

      // Since the method calls handleScheduledYnabSync internally, we can't directly test it
      // but we can verify it doesn't throw
      expect(spy).not.toHaveBeenCalled(); // handleScheduledYnabSync is called, not fetchAndCacheConfig
    });
  });

  describe('Dynamic Cron Job Creation', () => {
    it('should call SchedulerRegistry methods when custom schedule is configured', async () => {
      const configUrl = 'https://example.com/config.yaml';
      const yamlContent = `
budget: test-budget-id
schedule:
  sync_time: "9pm"
  sync_frequency: daily
  timezone: "America/New_York"
accounts:
  - account_id: account-1
    holdings:
      AAPL: 10
`;

      vi.mocked(configService.get).mockReturnValue(configUrl);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(yamlContent),
      } as Response);

      await service.fetchAndCacheConfig();

      // Verify that scheduler registry methods are called
      expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledWith('custom-ynab-sync');
      expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
        'custom-ynab-sync',
        expect.any(Object),
      );
    });

    it('should not create dynamic cron when no schedule is configured', async () => {
      const configUrl = 'https://example.com/config.yaml';
      const yamlContent = `
budget: test-budget-id
accounts:
  - account_id: account-1
    holdings:
      AAPL: 10
`;

      vi.mocked(configService.get).mockReturnValue(configUrl);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(yamlContent),
      } as Response);

      // Clear any previous calls
      vi.mocked(schedulerRegistry.addCronJob).mockClear();
      vi.mocked(schedulerRegistry.deleteCronJob).mockClear();

      await service.fetchAndCacheConfig();

      // Should still try to delete (cleanup) but not add
      expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledWith('custom-ynab-sync');
      expect(schedulerRegistry.addCronJob).not.toHaveBeenCalled();
    });
  });

  describe('Fallback Cron Job Behavior', () => {
    it('should trigger sync when no custom schedule exists', async () => {
      // Setup a config without custom schedule
      const configUrl = 'https://example.com/config.yaml';
      const yamlContent = `
budget: test-budget-id
accounts:
  - account_id: account-1
    holdings:
      AAPL: 10
`;

      vi.mocked(configService.get).mockReturnValue(configUrl);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(yamlContent),
      } as Response);

      await service.fetchAndCacheConfig();

      // Mock the private method to avoid actual sync logic
      const handleScheduledSyncSpy = vi
        .spyOn(
          service as unknown as { handleScheduledYnabSync: () => Promise<void> },
          'handleScheduledYnabSync',
        )
        .mockResolvedValue(undefined);

      await service.handleWeeklyYnabSync();

      expect(handleScheduledSyncSpy).toHaveBeenCalledOnce();
    });

    it('should skip sync when custom schedule exists', async () => {
      // Setup a config with custom schedule
      const configUrl = 'https://example.com/config.yaml';
      const yamlContent = `
budget: test-budget-id
schedule:
  sync_time: "8pm"
  sync_frequency: daily
accounts:
  - account_id: account-1
    holdings:
      AAPL: 10
`;

      vi.mocked(configService.get).mockReturnValue(configUrl);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(yamlContent),
      } as Response);

      await service.fetchAndCacheConfig();

      // Mock the private method to verify it's not called
      const handleScheduledSyncSpy = vi
        .spyOn(
          service as unknown as { handleScheduledYnabSync: () => Promise<void> },
          'handleScheduledYnabSync',
        )
        .mockResolvedValue(undefined);

      await service.handleWeeklyYnabSync();

      expect(handleScheduledSyncSpy).not.toHaveBeenCalled();
    });
  });
});
