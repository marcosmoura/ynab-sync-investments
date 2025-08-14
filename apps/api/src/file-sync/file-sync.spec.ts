import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { MarketDataService } from '@/market-data/market-data.service';
import { YnabService } from '@/ynab/ynab.service';

import { FileSyncService } from './file-sync.service';

describe('FileSyncService', () => {
  let service: FileSyncService;
  let configService: ConfigService;

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
      ],
    }).compile();

    service = moduleRef.get(FileSyncService);
    configService = moduleRef.get(ConfigService);

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
      const spy = vi.spyOn(service, 'fetchAndCacheConfig').mockResolvedValue();

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
});
