import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { AssetService } from '@/asset/asset.service';
import { SyncSchedule } from '@/database/entities';
import { MarketDataService } from '@/market-data/market-data.service';
import { UserSettingsResponseDto } from '@/user-settings/dto';
import { UserSettingsService } from '@/user-settings/user-settings.service';
import { YnabService } from '@/ynab/ynab.service';

import { SyncService } from './sync.service';

describe('SyncService', () => {
  let service: SyncService;

  const mockUserSettings: UserSettingsResponseDto = {
    id: 'test-id',
    ynabApiToken: 'test-token',
    syncSchedule: SyncSchedule.DAILY,
    targetBudgetId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAssetService = {
    findAll: vi.fn(),
  };

  const mockUserSettingsService = {
    findSettings: vi.fn(),
  };

  const mockYnabService = {
    getAccounts: vi.fn(),
    reconcileAccountBalance: vi.fn(),
  };

  const mockMarketDataService = {
    getAssetPrices: vi.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: AssetService,
          useValue: mockAssetService,
        },
        {
          provide: UserSettingsService,
          useValue: mockUserSettingsService,
        },
        {
          provide: YnabService,
          useValue: mockYnabService,
        },
        {
          provide: MarketDataService,
          useValue: mockMarketDataService,
        },
      ],
    }).compile();

    service = moduleRef.get(SyncService);

    // Reset mocks
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleScheduledSync', () => {
    it('should skip sync when no user settings found', async () => {
      mockUserSettingsService.findSettings.mockResolvedValue(null);

      await service.handleScheduledSync();

      expect(mockUserSettingsService.findSettings).toHaveBeenCalled();
      expect(mockAssetService.findAll).not.toHaveBeenCalled();
    });

    it('should skip sync when shouldSync returns false', async () => {
      const mockSettings = {
        ynabApiToken: 'test-token',
        syncSchedule: SyncSchedule.WEEKLY,
      };
      mockUserSettingsService.findSettings.mockResolvedValue(mockSettings);

      // Mock shouldSync to return false
      vi.spyOn(service, 'shouldSync').mockReturnValue(false);

      await service.handleScheduledSync();

      expect(mockUserSettingsService.findSettings).toHaveBeenCalled();
      expect(service.shouldSync).toHaveBeenCalledWith(SyncSchedule.WEEKLY);
      expect(mockAssetService.findAll).not.toHaveBeenCalled();
    });

    it('should perform sync when shouldSync returns true', async () => {
      const mockSettings = {
        ynabApiToken: 'test-token',
        syncSchedule: SyncSchedule.DAILY,
      };
      mockUserSettingsService.findSettings.mockResolvedValue(mockSettings);

      // Mock shouldSync to return true
      vi.spyOn(service, 'shouldSync').mockReturnValue(true);
      vi.spyOn(service, 'performSync').mockResolvedValue();

      await service.handleScheduledSync();

      expect(mockUserSettingsService.findSettings).toHaveBeenCalled();
      expect(service.shouldSync).toHaveBeenCalledWith(SyncSchedule.DAILY);
      expect(service.performSync).toHaveBeenCalledWith({
        ynabApiToken: 'test-token',
        syncSchedule: SyncSchedule.DAILY,
      });
    });

    it('should handle errors gracefully', async () => {
      mockUserSettingsService.findSettings.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.handleScheduledSync()).resolves.toBeUndefined();
    });
  });

  describe('performSync', () => {
    const mockAssets = [
      {
        id: '1',
        symbol: 'AAPL',
        amount: 10,
        ynabAccountId: 'account-1',
      },
      {
        id: '2',
        symbol: 'MSFT',
        amount: 5,
        ynabAccountId: 'account-1',
      },
      {
        id: '3',
        symbol: 'BTC',
        amount: 0.5,
        ynabAccountId: 'account-2',
      },
    ];

    const mockYnabAccounts = [
      { id: 'account-1', name: 'Investment Account 1', currency: 'USD' },
      { id: 'account-2', name: 'Investment Account 2', currency: 'EUR' },
    ];

    it('should handle NQSE.DE and other European symbols correctly', async () => {
      const mockEuropeanAssets = [
        {
          id: '1',
          symbol: 'AAPL',
          amount: 10,
          ynabAccountId: 'account-1',
        },
        {
          id: '2',
          symbol: 'NQSE.DE', // German ETF symbol
          amount: 5,
          ynabAccountId: 'account-1',
        },
        {
          id: '3',
          symbol: 'ASML.AS', // Dutch stock symbol
          amount: 3,
          ynabAccountId: 'account-1',
        },
        {
          id: '4',
          symbol: 'BTC',
          amount: 0.1,
          ynabAccountId: 'account-2',
        },
      ];

      mockAssetService.findAll.mockResolvedValue(mockEuropeanAssets);
      mockYnabService.getAccounts.mockResolvedValue(mockYnabAccounts);

      // Mock market data responses - European symbols handled by Polygon.io
      mockMarketDataService.getAssetPrices
        .mockResolvedValueOnce([
          { symbol: 'AAPL', price: 150.0, currency: 'USD' },
          { symbol: 'NQSE.DE', price: 85.5, currency: 'USD' }, // Polygon.io handles this
          { symbol: 'ASML.AS', price: 750.0, currency: 'USD' }, // Polygon.io handles this too
        ])
        .mockResolvedValueOnce([{ symbol: 'BTC', price: 45000.0, currency: 'EUR' }]);

      mockYnabService.reconcileAccountBalance.mockResolvedValue(undefined);

      await service.performSync(mockUserSettings);

      expect(mockAssetService.findAll).toHaveBeenCalled();
      expect(mockYnabService.getAccounts).toHaveBeenCalledWith('test-token', null);

      // Verify market data calls include all symbols (CoinMarketCap filters, Polygon.io handles all)
      expect(mockMarketDataService.getAssetPrices).toHaveBeenCalledWith(
        ['AAPL', 'NQSE.DE', 'ASML.AS'],
        'USD',
      );
      expect(mockMarketDataService.getAssetPrices).toHaveBeenCalledWith(['BTC'], 'EUR');

      // Verify YNAB account balance includes all assets with correct calculations
      expect(mockYnabService.reconcileAccountBalance).toHaveBeenCalledWith(
        'test-token',
        'account-1',
        4177.5, // AAPL: 10*150 + NQSE.DE: 5*85.50 + ASML.AS: 3*750 = 1500 + 427.5 + 2250 = 4177.5
        null,
        ['AAPL', 'NQSE.DE', 'ASML.AS'],
      );
      expect(mockYnabService.reconcileAccountBalance).toHaveBeenCalledWith(
        'test-token',
        'account-2',
        4500, // BTC: 0.1 * 45000 = 4500
        null,
        ['BTC'],
      );
    });

    it('should handle mixed symbols where some fail price lookup', async () => {
      const mockMixedAssets = [
        {
          id: '1',
          symbol: 'AAPL',
          amount: 10,
          ynabAccountId: 'account-1',
        },
        {
          id: '2',
          symbol: 'NQSE.DE',
          amount: 5,
          ynabAccountId: 'account-1',
        },
        {
          id: '3',
          symbol: 'UNKNOWN.SYM', // This symbol won't be found
          amount: 3,
          ynabAccountId: 'account-1',
        },
      ];

      mockAssetService.findAll.mockResolvedValue(mockMixedAssets);
      mockYnabService.getAccounts.mockResolvedValue([mockYnabAccounts[0]]);

      // Mock market data - UNKNOWN.SYM not found, NQSE.DE found
      mockMarketDataService.getAssetPrices.mockResolvedValueOnce([
        { symbol: 'AAPL', price: 150.0, currency: 'USD' },
        { symbol: 'NQSE.DE', price: 85.5, currency: 'USD' },
        // UNKNOWN.SYM is missing from response (no price found)
      ]);

      mockYnabService.reconcileAccountBalance.mockResolvedValue(undefined);

      await service.performSync(mockUserSettings);

      // Should only reconcile with assets that have valid prices
      expect(mockYnabService.reconcileAccountBalance).toHaveBeenCalledWith(
        'test-token',
        'account-1',
        1927.5, // Only AAPL: 10*150 + NQSE.DE: 5*85.50 = 1500 + 427.5 = 1927.5
        null,
        ['AAPL', 'NQSE.DE', 'UNKNOWN.SYM'], // All symbols passed, but only valid ones used
      );
    });

    it('should handle NQSE.DE with currency conversion', async () => {
      const mockEuroAssets = [
        {
          id: '1',
          symbol: 'NQSE.DE',
          amount: 10,
          ynabAccountId: 'account-eur',
        },
      ];

      const mockEuroAccounts = [
        { id: 'account-eur', name: 'European Investment Account', currency: 'EUR' },
      ];

      mockAssetService.findAll.mockResolvedValue(mockEuroAssets);
      mockYnabService.getAccounts.mockResolvedValue(mockEuroAccounts);

      // Mock market data with EUR currency
      mockMarketDataService.getAssetPrices.mockResolvedValueOnce([
        { symbol: 'NQSE.DE', price: 75.8, currency: 'EUR' }, // Price in EUR
      ]);

      mockYnabService.reconcileAccountBalance.mockResolvedValue(undefined);

      await service.performSync(mockUserSettings);

      // Verify the call was made with EUR currency
      expect(mockMarketDataService.getAssetPrices).toHaveBeenCalledWith(['NQSE.DE'], 'EUR');

      // Verify reconciliation with EUR values
      expect(mockYnabService.reconcileAccountBalance).toHaveBeenCalledWith(
        'test-token',
        'account-eur',
        758, // NQSE.DE: 10 * 75.80 = 758 EUR
        null,
        ['NQSE.DE'],
      );
    });

    it('should handle symbols with special characters correctly', async () => {
      const mockAssetsWithSpecialChars = [
        {
          id: '1',
          symbol: 'AAPL',
          amount: 10,
          ynabAccountId: 'account-1',
        },
        {
          id: '2',
          symbol: 'NQSE.DE', // Symbol with special characters
          amount: 5,
          ynabAccountId: 'account-1',
        },
        {
          id: '3',
          symbol: 'BTC',
          amount: 0.5,
          ynabAccountId: 'account-2',
        },
      ];

      mockAssetService.findAll.mockResolvedValue(mockAssetsWithSpecialChars);
      mockYnabService.getAccounts.mockResolvedValue(mockYnabAccounts);

      // Mock market data prices - NQSE.DE should be handled by Polygon.io, not CoinMarketCap
      mockMarketDataService.getAssetPrices
        .mockResolvedValueOnce([
          { symbol: 'AAPL', price: 150.0, currency: 'USD' },
          { symbol: 'NQSE.DE', price: 100.0, currency: 'USD' }, // Polygon.io can handle this
        ])
        .mockResolvedValueOnce([{ symbol: 'BTC', price: 40000.0, currency: 'EUR' }]);

      mockYnabService.reconcileAccountBalance.mockResolvedValue(undefined);

      await service.performSync(mockUserSettings);

      expect(mockAssetService.findAll).toHaveBeenCalled();
      expect(mockYnabService.getAccounts).toHaveBeenCalledWith('test-token', null);

      // Verify market data calls - should include both regular and special character symbols
      expect(mockMarketDataService.getAssetPrices).toHaveBeenCalledWith(['AAPL', 'NQSE.DE'], 'USD');
      expect(mockMarketDataService.getAssetPrices).toHaveBeenCalledWith(['BTC'], 'EUR');

      // Verify YNAB account balance reconciliation includes both assets
      expect(mockYnabService.reconcileAccountBalance).toHaveBeenCalledWith(
        'test-token',
        'account-1',
        2000, // AAPL: 10 * 150 + NQSE.DE: 5 * 100 = 1500 + 500 = 2000
        null,
        ['AAPL', 'NQSE.DE'],
      );
      expect(mockYnabService.reconcileAccountBalance).toHaveBeenCalledWith(
        'test-token',
        'account-2',
        20000, // BTC: 0.5 * 40000 = 20000
        null,
        ['BTC'],
      );
    });

    it('should skip assets with invalid prices', async () => {
      const mockAssetsWithInvalidPrices = [
        {
          id: '1',
          symbol: 'AAPL',
          amount: 10,
          ynabAccountId: 'account-1',
        },
        {
          id: '2',
          symbol: 'INVALID',
          amount: 5,
          ynabAccountId: 'account-1',
        },
        {
          id: '3',
          symbol: 'ZERO_PRICE',
          amount: 3,
          ynabAccountId: 'account-1',
        },
      ];

      mockAssetService.findAll.mockResolvedValue(mockAssetsWithInvalidPrices);
      mockYnabService.getAccounts.mockResolvedValue([mockYnabAccounts[0]]);

      // Mock market data prices with some invalid scenarios
      mockMarketDataService.getAssetPrices.mockResolvedValueOnce([
        { symbol: 'AAPL', price: 150.0, currency: 'USD' },
        // INVALID symbol has no price data (missing from response)
        { symbol: 'ZERO_PRICE', price: 0, currency: 'USD' }, // Invalid price (0)
      ]);

      mockYnabService.reconcileAccountBalance.mockResolvedValue(undefined);

      await service.performSync(mockUserSettings);

      // Should only reconcile with AAPL value (INVALID and ZERO_PRICE are skipped)
      expect(mockYnabService.reconcileAccountBalance).toHaveBeenCalledWith(
        'test-token',
        'account-1',
        1500, // Only AAPL: 10 * 150 = 1500
        null,
        ['AAPL', 'INVALID', 'ZERO_PRICE'], // All symbols passed, but only valid ones used in calculation
      );
    });

    it('should skip sync when no assets found', async () => {
      mockAssetService.findAll.mockResolvedValue([]);

      await service.performSync(mockUserSettings);

      expect(mockAssetService.findAll).toHaveBeenCalled();
      expect(mockYnabService.getAccounts).not.toHaveBeenCalled();
    });

    it('should sync assets successfully', async () => {
      mockAssetService.findAll.mockResolvedValue(mockAssets);
      mockYnabService.getAccounts.mockResolvedValue(mockYnabAccounts);

      // Mock market data prices for bulk requests
      mockMarketDataService.getAssetPrices
        .mockResolvedValueOnce([
          { symbol: 'AAPL', price: 150.0, currency: 'USD' },
          { symbol: 'MSFT', price: 300.0, currency: 'USD' },
        ])
        .mockResolvedValueOnce([{ symbol: 'BTC', price: 40000.0, currency: 'EUR' }]);

      mockYnabService.reconcileAccountBalance.mockResolvedValue(undefined);

      await service.performSync(mockUserSettings);

      expect(mockAssetService.findAll).toHaveBeenCalled();
      expect(mockYnabService.getAccounts).toHaveBeenCalledWith('test-token', null);

      // Verify market data calls - should be called once per currency
      expect(mockMarketDataService.getAssetPrices).toHaveBeenCalledWith(['AAPL', 'MSFT'], 'USD');
      expect(mockMarketDataService.getAssetPrices).toHaveBeenCalledWith(['BTC'], 'EUR');

      // Verify YNAB account balance reconciliation
      expect(mockYnabService.reconcileAccountBalance).toHaveBeenCalledWith(
        'test-token',
        'account-1',
        3000, // AAPL: 10 * 150 + MSFT: 5 * 300 = 1500 + 1500 = 3000
        null,
        ['AAPL', 'MSFT'],
      );
      expect(mockYnabService.reconcileAccountBalance).toHaveBeenCalledWith(
        'test-token',
        'account-2',
        20000, // BTC: 0.5 * 40000 = 20000
        null,
        ['BTC'],
      );
    });

    it('should skip assets for unknown YNAB accounts', async () => {
      const assetsWithUnknownAccount = [
        ...mockAssets,
        {
          id: '4',
          symbol: 'ETH',
          amount: 2,
          ynabAccountId: 'unknown-account',
        },
      ];

      mockAssetService.findAll.mockResolvedValue(assetsWithUnknownAccount);
      mockYnabService.getAccounts.mockResolvedValue(mockYnabAccounts);

      mockMarketDataService.getAssetPrices
        .mockResolvedValueOnce([
          { symbol: 'AAPL', price: 150.0, currency: 'USD' },
          { symbol: 'MSFT', price: 300.0, currency: 'USD' },
        ])
        .mockResolvedValueOnce([{ symbol: 'BTC', price: 40000.0, currency: 'EUR' }]);

      mockYnabService.reconcileAccountBalance.mockResolvedValue(undefined);

      await service.performSync(mockUserSettings);

      // Should only call for known accounts and their currencies
      expect(mockMarketDataService.getAssetPrices).toHaveBeenCalledTimes(2);
      expect(mockYnabService.reconcileAccountBalance).toHaveBeenCalledTimes(2);
    });

    it('should handle market data errors gracefully', async () => {
      mockAssetService.findAll.mockResolvedValue([mockAssets[0]]); // Only AAPL
      mockYnabService.getAccounts.mockResolvedValue(mockYnabAccounts);

      // Mock market data to throw error
      mockMarketDataService.getAssetPrices.mockRejectedValue(new Error('Price not available'));

      mockYnabService.reconcileAccountBalance.mockResolvedValue(undefined);

      await service.performSync(mockUserSettings);

      // Should still try to reconcile account balance (with 0 total value)
      expect(mockYnabService.reconcileAccountBalance).not.toHaveBeenCalled();
    });

    it('should handle YNAB service errors', async () => {
      mockAssetService.findAll.mockResolvedValue([mockAssets[0]]);
      mockYnabService.getAccounts.mockRejectedValue(new Error('YNAB API error'));

      await expect(service.performSync(mockUserSettings)).rejects.toThrow('YNAB API error');
    });
  });

  describe('shouldSync', () => {
    beforeEach(() => {
      // Mock Date to have consistent test results
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should sync daily', () => {
      vi.setSystemTime(new Date('2024-01-15')); // Any date

      const result = service.shouldSync(SyncSchedule.DAILY);

      expect(result).toBe(true);
    });

    it('should sync every two days on even days', () => {
      vi.setSystemTime(new Date('2024-01-16')); // 16th (even)

      const result = service.shouldSync(SyncSchedule.EVERY_TWO_DAYS);

      expect(result).toBe(true);
    });

    it('should not sync every two days on odd days', () => {
      vi.setSystemTime(new Date('2024-01-15')); // 15th (odd)

      const result = service.shouldSync(SyncSchedule.EVERY_TWO_DAYS);

      expect(result).toBe(false);
    });

    it('should sync weekly on Mondays', () => {
      vi.setSystemTime(new Date('2024-01-15')); // Monday

      const result = service.shouldSync(SyncSchedule.WEEKLY);

      expect(result).toBe(true);
    });

    it('should not sync weekly on other days', () => {
      vi.setSystemTime(new Date('2024-01-16')); // Tuesday

      const result = service.shouldSync(SyncSchedule.WEEKLY);

      expect(result).toBe(false);
    });

    it('should sync every two weeks on Monday during even weeks', () => {
      // Set to Monday in week 2 of the month
      vi.setSystemTime(new Date('2024-01-08')); // Monday, week 2

      const result = service.shouldSync(SyncSchedule.EVERY_TWO_WEEKS);

      expect(result).toBe(true);
    });

    it('should not sync every two weeks on Monday during odd weeks', () => {
      // Set to Monday in week 1 of the month
      vi.setSystemTime(new Date('2024-01-01')); // Monday, week 1

      const result = service.shouldSync(SyncSchedule.EVERY_TWO_WEEKS);

      expect(result).toBe(false);
    });

    it('should not sync every two weeks on non-Monday days', () => {
      // Set to Tuesday in week 2 of the month
      vi.setSystemTime(new Date('2024-01-09')); // Tuesday, week 2

      const result = service.shouldSync(SyncSchedule.EVERY_TWO_WEEKS);

      expect(result).toBe(false);
    });

    it('should sync monthly first on first day of month', () => {
      vi.setSystemTime(new Date('2024-01-01')); // 1st

      const result = service.shouldSync(SyncSchedule.MONTHLY_FIRST);

      expect(result).toBe(true);
    });

    it('should not sync monthly first on other days', () => {
      vi.setSystemTime(new Date('2024-01-15')); // 15th

      const result = service.shouldSync(SyncSchedule.MONTHLY_FIRST);

      expect(result).toBe(false);
    });

    it('should sync monthly last on last day of month', () => {
      vi.setSystemTime(new Date('2024-01-31')); // Last day of January

      const result = service.shouldSync(SyncSchedule.MONTHLY_LAST);

      expect(result).toBe(true);
    });

    it('should not sync monthly last on other days', () => {
      vi.setSystemTime(new Date('2024-01-15')); // 15th

      const result = service.shouldSync(SyncSchedule.MONTHLY_LAST);

      expect(result).toBe(false);
    });

    it('should return false for invalid schedule', () => {
      vi.setSystemTime(new Date('2024-01-01'));

      // Use an invalid schedule value
      const result = service.shouldSync('INVALID_SCHEDULE' as SyncSchedule);

      expect(result).toBe(false);
    });
  });

  describe('triggerManualSync', () => {
    it('should perform sync with user settings', async () => {
      const mockSettings = {
        ynabApiToken: 'manual-test-token',
        syncSchedule: SyncSchedule.DAILY,
      };
      mockUserSettingsService.findSettings.mockResolvedValue(mockSettings);

      vi.spyOn(service, 'performSync').mockResolvedValue();

      await service.triggerManualSync();

      expect(mockUserSettingsService.findSettings).toHaveBeenCalled();
      expect(service.performSync).toHaveBeenCalledWith(mockSettings);
    });

    it('should throw error when no user settings found', async () => {
      mockUserSettingsService.findSettings.mockResolvedValue(null);

      await expect(service.triggerManualSync()).rejects.toThrow(
        'No user settings found. Please configure the application first.',
      );
    });
  });
});
