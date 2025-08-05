import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SyncService } from '@/sync/sync.service';

import { YnabAccountDto } from './dto';
import { YnabController } from './ynab.controller';
import { YnabService } from './ynab.service';

describe('YnabController', () => {
  let controller: YnabController;
  let ynabService: YnabService;
  let syncService: SyncService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [YnabController],
      providers: [
        {
          provide: YnabService,
          useValue: {
            getAccounts: vi.fn(),
          },
        },
        {
          provide: SyncService,
          useValue: {
            triggerManualSync: vi.fn(),
          },
        },
      ],
    }).compile();

    ynabService = moduleRef.get(YnabService);
    syncService = moduleRef.get(SyncService);
    controller = moduleRef.get(YnabController);
  });

  describe('getAccounts', () => {
    it('should return YNAB accounts', async () => {
      const mockAccounts: YnabAccountDto[] = [
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          name: 'Investment Account',
          type: 'investmentAccount',
          balance: 150000,
          currency: 'USD',
        },
        {
          id: 'b2c3d4e5-f6g7-8901-bcde-f23456789012',
          name: 'Checking Account',
          type: 'checking',
          balance: 50000,
          currency: 'USD',
        },
      ];

      vi.spyOn(ynabService, 'getAccounts').mockResolvedValue(mockAccounts);

      const result = await controller.getAccounts('test-token');

      expect(ynabService.getAccounts).toHaveBeenCalledWith('test-token');
      expect(result).toEqual(mockAccounts);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Investment Account');
      expect(result[1].name).toBe('Checking Account');
    });

    it('should handle service errors', async () => {
      vi.spyOn(ynabService, 'getAccounts').mockRejectedValue(new Error('Invalid token'));

      await expect(controller.getAccounts('invalid-token')).rejects.toThrow('Invalid token');
      expect(ynabService.getAccounts).toHaveBeenCalledWith('invalid-token');
    });

    it('should return empty array when no accounts found', async () => {
      vi.spyOn(ynabService, 'getAccounts').mockResolvedValue([]);

      const result = await controller.getAccounts('test-token');

      expect(ynabService.getAccounts).toHaveBeenCalledWith('test-token');
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('triggerSync', () => {
    it('should trigger manual sync and return success message', async () => {
      vi.spyOn(syncService, 'triggerManualSync').mockResolvedValue(undefined);

      const result = await controller.triggerSync();

      expect(syncService.triggerManualSync).toHaveBeenCalledWith();
      expect(result).toEqual({ message: 'Sync completed successfully' });
    });

    it('should handle sync service errors', async () => {
      vi.spyOn(syncService, 'triggerManualSync').mockRejectedValue(new Error('Sync failed'));

      await expect(controller.triggerSync()).rejects.toThrow('Sync failed');
      expect(syncService.triggerManualSync).toHaveBeenCalledWith();
    });
  });
});

describe('YnabService', () => {
  let service: YnabService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [YnabService],
    }).compile();

    service = moduleRef.get(YnabService);
  });

  describe('getAccounts', () => {
    it('should fetch accounts from YNAB API', async () => {
      const mockBudgetsResponse = {
        data: {
          budgets: [
            {
              id: 'budget-123',
              currency_format: { iso_code: 'USD' },
            },
          ],
        },
      };

      const mockAccountsResponse = {
        data: {
          accounts: [
            {
              id: 'account-123',
              name: 'Investment Account',
              type: 'investmentAccount',
              balance: 150000, // In milliunits
            },
            {
              id: 'account-456',
              name: 'Checking Account',
              type: 'checking',
              balance: 50000, // In milliunits
            },
          ],
        },
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBudgetsResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccountsResponse),
        } as Response);

      const result = await service.getAccounts('test-token');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(1, 'https://api.youneedabudget.com/v1/budgets', {
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      });
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'https://api.youneedabudget.com/v1/budgets/budget-123/accounts',
        {
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        },
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'account-123',
        name: 'Investment Account',
        type: 'investmentAccount',
        balance: 150, // Converted from milliunits
        currency: 'USD',
      });
      expect(result[1]).toEqual({
        id: 'account-456',
        name: 'Checking Account',
        type: 'checking',
        balance: 50, // Converted from milliunits
        currency: 'USD',
      });
    });

    it('should handle no budgets found', async () => {
      const mockBudgetsResponse = {
        data: { budgets: [] },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBudgetsResponse),
      } as Response);

      await expect(service.getAccounts('test-token')).rejects.toThrow(
        'Failed to fetch YNAB accounts',
      );
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      await expect(service.getAccounts('invalid-token')).rejects.toThrow(
        'Failed to fetch YNAB accounts',
      );
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should use default currency when not provided', async () => {
      const mockBudgetsResponse = {
        data: {
          budgets: [
            {
              id: 'budget-123',
              currency_format: null, // No currency format
            },
          ],
        },
      };

      const mockAccountsResponse = {
        data: {
          accounts: [
            {
              id: 'account-123',
              name: 'Investment Account',
              type: 'investmentAccount',
              balance: 150000,
            },
          ],
        },
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBudgetsResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccountsResponse),
        } as Response);

      const result = await service.getAccounts('test-token');

      expect(result[0].currency).toBe('USD');
    });
  });

  describe('updateAccountBalance', () => {
    it('should update account balance via YNAB API', async () => {
      const mockBudgetsResponse = {
        data: {
          budgets: [{ id: 'budget-123' }],
        },
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBudgetsResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response);

      await service.updateAccountBalance('test-token', 'account-123', 1500.5);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(1, 'https://api.youneedabudget.com/v1/budgets', {
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      });
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'https://api.youneedabudget.com/v1/budgets/budget-123/transactions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"account_id":"account-123"'),
        }),
      );
    });

    it('should handle no budgets found for balance update', async () => {
      const mockBudgetsResponse = {
        data: { budgets: [] },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBudgetsResponse),
      } as Response);

      await expect(service.updateAccountBalance('test-token', 'account-123', 1500)).rejects.toThrow(
        'Failed to update account balance',
      );
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors during balance update', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      await expect(
        service.updateAccountBalance('invalid-token', 'account-123', 1500),
      ).rejects.toThrow('Failed to update account balance');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle transaction creation errors', async () => {
      const mockBudgetsResponse = {
        data: {
          budgets: [{ id: 'budget-123' }],
        },
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBudgetsResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
        } as Response);

      await expect(service.updateAccountBalance('test-token', 'account-123', 1500)).rejects.toThrow(
        'Failed to update account balance',
      );
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});
