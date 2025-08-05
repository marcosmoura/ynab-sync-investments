import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SyncService } from '@/sync/sync.service';

import { YnabAccountDto, YnabBudgetDto } from './dto';
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
            getBudgets: vi.fn(),
            getAccounts: vi.fn(),
            updateAccountBalance: vi.fn(),
            reconcileAccountBalance: vi.fn(),
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

  describe('getBudgets', () => {
    it('should return YNAB budgets', async () => {
      const mockBudgets: YnabBudgetDto[] = [
        {
          id: 'budget-123',
          name: 'My Budget',
          currency: 'USD',
          lastModifiedOn: new Date('2023-01-01T00:00:00Z'),
          firstMonth: '2023-01',
          lastMonth: '2023-12',
        },
        {
          id: 'budget-456',
          name: 'Another Budget',
          currency: 'EUR',
          lastModifiedOn: new Date('2023-02-01T00:00:00Z'),
          firstMonth: '2023-01',
          lastMonth: '2023-12',
        },
      ];

      vi.spyOn(ynabService, 'getBudgets').mockResolvedValue(mockBudgets);

      const result = await controller.getBudgets('test-token');

      expect(ynabService.getBudgets).toHaveBeenCalledWith('test-token');
      expect(result).toEqual(mockBudgets);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('My Budget');
      expect(result[1].name).toBe('Another Budget');
    });

    it('should handle service errors', async () => {
      vi.spyOn(ynabService, 'getBudgets').mockRejectedValue(new Error('Invalid token'));

      await expect(controller.getBudgets('invalid-token')).rejects.toThrow('Invalid token');
      expect(ynabService.getBudgets).toHaveBeenCalledWith('invalid-token');
    });

    it('should return empty array when no budgets found', async () => {
      vi.spyOn(ynabService, 'getBudgets').mockResolvedValue([]);

      const result = await controller.getBudgets('test-token');

      expect(ynabService.getBudgets).toHaveBeenCalledWith('test-token');
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
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

      const result = await controller.getAccounts({ token: 'test-token' });

      expect(ynabService.getAccounts).toHaveBeenCalledWith('test-token', undefined);
      expect(result).toEqual(mockAccounts);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Investment Account');
      expect(result[1].name).toBe('Checking Account');
    });

    it('should handle service errors', async () => {
      vi.spyOn(ynabService, 'getAccounts').mockRejectedValue(new Error('Invalid token'));

      await expect(controller.getAccounts({ token: 'invalid-token' })).rejects.toThrow(
        'Invalid token',
      );
      expect(ynabService.getAccounts).toHaveBeenCalledWith('invalid-token', undefined);
    });

    it('should return empty array when no accounts found', async () => {
      vi.spyOn(ynabService, 'getAccounts').mockResolvedValue([]);

      const result = await controller.getAccounts({ token: 'test-token' });

      expect(ynabService.getAccounts).toHaveBeenCalledWith('test-token', undefined);
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('updateAccountBalance', () => {
    it('should update account balance successfully', async () => {
      vi.spyOn(ynabService, 'updateAccountBalance').mockResolvedValue(undefined);

      const result = await controller.updateAccountBalance({
        token: 'test-token',
        accountId: 'test-account-id',
        balance: 1500.5,
        budgetId: 'test-budget-id',
      });

      expect(ynabService.updateAccountBalance).toHaveBeenCalledWith(
        'test-token',
        'test-account-id',
        1500.5,
        'test-budget-id',
      );
      expect(result).toEqual({ message: 'Account balance updated successfully' });
    });

    it('should update account balance without budget ID', async () => {
      vi.spyOn(ynabService, 'updateAccountBalance').mockResolvedValue(undefined);

      const result = await controller.updateAccountBalance({
        token: 'test-token',
        accountId: 'test-account-id',
        balance: 1500.5,
      });

      expect(ynabService.updateAccountBalance).toHaveBeenCalledWith(
        'test-token',
        'test-account-id',
        1500.5,
        undefined,
      );
      expect(result).toEqual({ message: 'Account balance updated successfully' });
    });

    it('should handle update account balance errors', async () => {
      vi.spyOn(ynabService, 'updateAccountBalance').mockRejectedValue(new Error('Update failed'));

      await expect(
        controller.updateAccountBalance({
          token: 'test-token',
          accountId: 'test-account-id',
          balance: 1500.5,
        }),
      ).rejects.toThrow('Update failed');
      expect(ynabService.updateAccountBalance).toHaveBeenCalledWith(
        'test-token',
        'test-account-id',
        1500.5,
        undefined,
      );
    });
  });

  describe('reconcileAccountBalance', () => {
    it('should reconcile account balance successfully', async () => {
      vi.spyOn(ynabService, 'reconcileAccountBalance').mockResolvedValue(undefined);

      const result = await controller.reconcileAccountBalance({
        token: 'test-token',
        accountId: 'test-account-id',
        targetBalance: 1500.5,
        budgetId: 'test-budget-id',
        assetSymbols: ['AAPL', 'MSFT'],
      });

      expect(ynabService.reconcileAccountBalance).toHaveBeenCalledWith(
        'test-token',
        'test-account-id',
        1500.5,
        'test-budget-id',
        ['AAPL', 'MSFT'],
      );
      expect(result).toEqual({ message: 'Account balance reconciled successfully' });
    });

    it('should reconcile account balance without optional parameters', async () => {
      vi.spyOn(ynabService, 'reconcileAccountBalance').mockResolvedValue(undefined);

      const result = await controller.reconcileAccountBalance({
        token: 'test-token',
        accountId: 'test-account-id',
        targetBalance: 1500.5,
      });

      expect(ynabService.reconcileAccountBalance).toHaveBeenCalledWith(
        'test-token',
        'test-account-id',
        1500.5,
        undefined,
        undefined,
      );
      expect(result).toEqual({ message: 'Account balance reconciled successfully' });
    });

    it('should handle reconcile account balance errors', async () => {
      vi.spyOn(ynabService, 'reconcileAccountBalance').mockRejectedValue(
        new Error('Reconciliation failed'),
      );

      await expect(
        controller.reconcileAccountBalance({
          token: 'test-token',
          accountId: 'test-account-id',
          targetBalance: 1500.5,
        }),
      ).rejects.toThrow('Reconciliation failed');
      expect(ynabService.reconcileAccountBalance).toHaveBeenCalledWith(
        'test-token',
        'test-account-id',
        1500.5,
        undefined,
        undefined,
      );
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

  describe('getBudgets', () => {
    it('should fetch budgets from YNAB API', async () => {
      const mockBudgetsResponse = {
        data: {
          budgets: [
            {
              id: 'budget-123',
              name: 'My Budget',
              last_modified_on: '2023-01-01T00:00:00Z',
              first_month: '2023-01',
              last_month: '2023-12',
              currency_format: { iso_code: 'USD' },
            },
            {
              id: 'budget-456',
              name: 'Another Budget',
              last_modified_on: '2023-02-01T00:00:00Z',
              first_month: '2023-01',
              last_month: '2023-12',
              currency_format: { iso_code: 'EUR' },
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBudgetsResponse),
      } as Response);

      const result = await service.getBudgets('test-token');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('https://api.youneedabudget.com/v1/budgets', {
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'budget-123',
        name: 'My Budget',
        currency: 'USD',
        lastModifiedOn: new Date('2023-01-01T00:00:00Z'),
        firstMonth: '2023-01',
        lastMonth: '2023-12',
      });
      expect(result[1]).toEqual({
        id: 'budget-456',
        name: 'Another Budget',
        currency: 'EUR',
        lastModifiedOn: new Date('2023-02-01T00:00:00Z'),
        firstMonth: '2023-01',
        lastMonth: '2023-12',
      });
    });

    it('should return empty array when no budgets found', async () => {
      const mockBudgetsResponse = {
        data: { budgets: [] },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBudgetsResponse),
      } as Response);

      const result = await service.getBudgets('test-token');

      expect(result).toEqual([]);
    });

    it('should use default currency when currency format is missing', async () => {
      const mockBudgetsResponse = {
        data: {
          budgets: [
            {
              id: 'budget-123',
              name: 'My Budget',
              last_modified_on: '2023-01-01T00:00:00Z',
              first_month: '2023-01',
              last_month: '2023-12',
              currency_format: null,
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBudgetsResponse),
      } as Response);

      const result = await service.getBudgets('test-token');

      expect(result[0].currency).toBe('USD');
    });

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      await expect(service.getBudgets('invalid-token')).rejects.toThrow(
        'Failed to fetch YNAB budgets',
      );
    });
  });

  describe('getAccounts', () => {
    it('should fetch accounts from YNAB API without budget ID', async () => {
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

    it('should fetch accounts from YNAB API with specific budget ID', async () => {
      const mockBudgetResponse = {
        data: {
          budget: {
            currency_format: { iso_code: 'EUR' },
          },
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
          ],
        },
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBudgetResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccountsResponse),
        } as Response);

      const result = await service.getAccounts('test-token', 'budget-456');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        'https://api.youneedabudget.com/v1/budgets/budget-456',
        {
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        },
      );
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'https://api.youneedabudget.com/v1/budgets/budget-456/accounts',
        {
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        },
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'account-123',
        name: 'Investment Account',
        type: 'investmentAccount',
        balance: 150, // Converted from milliunits
        currency: 'EUR',
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

  describe('reconcileAccountBalance', () => {
    it('should reconcile account balance when target differs from current', async () => {
      const mockBudgetsResponse = {
        data: {
          budgets: [{ id: 'budget-123' }],
        },
      };

      const mockAccountResponse = {
        data: {
          account: {
            id: 'account-123',
            balance: 1000000, // $1000.00 in milliunits
          },
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
          json: () => Promise.resolve(mockAccountResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response);

      await service.reconcileAccountBalance('test-token', 'account-123', 1500.75);

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(fetch).toHaveBeenNthCalledWith(1, 'https://api.youneedabudget.com/v1/budgets', {
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      });
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'https://api.youneedabudget.com/v1/budgets/budget-123/accounts/account-123',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        }),
      );
      expect(fetch).toHaveBeenNthCalledWith(
        3,
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

      // Verify transaction details
      const fetchMock = vi.mocked(fetch);
      const thirdCall = fetchMock.mock.calls[2];
      const requestBody = thirdCall?.[1] as RequestInit;
      const thirdCallBody = JSON.parse(requestBody.body as string);
      expect(thirdCallBody.transaction.payee_name).toBe('Investment Portfolio Reconciliation');
      expect(thirdCallBody.transaction.amount).toBe(500750); // $500.75 in milliunits
      expect(thirdCallBody.transaction.memo).toBe('1000.00 → 1500.75');
      expect(thirdCallBody.transaction.cleared).toBe('cleared');
      expect(thirdCallBody.transaction.approved).toBe(true);
    });

    it('should reconcile account balance with asset symbols in memo', async () => {
      const mockBudgetsResponse = {
        data: {
          budgets: [{ id: 'budget-123' }],
        },
      };

      const mockAccountResponse = {
        data: {
          account: {
            id: 'account-123',
            balance: 1000000, // $1000.00 in milliunits
          },
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
          json: () => Promise.resolve(mockAccountResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response);

      await service.reconcileAccountBalance('test-token', 'account-123', 1200.0, undefined, [
        'AAPL',
        'MSFT',
      ]);

      const fetchMock = vi.mocked(fetch);
      const thirdCall = fetchMock.mock.calls[2];
      const requestBody = thirdCall?.[1] as RequestInit;
      const thirdCallBody = JSON.parse(requestBody.body as string);
      expect(thirdCallBody.transaction.memo).toBe('1000.00 → 1200.00 (AAPL, MSFT)');
    });

    it('should reconcile account balance with empty memo when no asset symbols', async () => {
      const mockBudgetsResponse = {
        data: {
          budgets: [{ id: 'budget-123' }],
        },
      };

      const mockAccountResponse = {
        data: {
          account: {
            id: 'account-123',
            balance: 1000000, // $1000.00 in milliunits
          },
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
          json: () => Promise.resolve(mockAccountResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response);

      await service.reconcileAccountBalance('test-token', 'account-123', 800.0);

      const fetchMock = vi.mocked(fetch);
      const thirdCall = fetchMock.mock.calls[2];
      const requestBody = thirdCall?.[1] as RequestInit;
      const thirdCallBody = JSON.parse(requestBody.body as string);
      expect(thirdCallBody.transaction.memo).toBe('1000.00 → 800.00');
    });

    it('should skip reconciliation when difference is less than 0.01', async () => {
      const mockBudgetsResponse = {
        data: {
          budgets: [{ id: 'budget-123' }],
        },
      };

      const mockAccountResponse = {
        data: {
          account: {
            id: 'account-123',
            balance: 1500000, // $1500.00 in milliunits
          },
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
          json: () => Promise.resolve(mockAccountResponse),
        } as Response);

      await service.reconcileAccountBalance('test-token', 'account-123', 1500.005); // Very small difference

      expect(fetch).toHaveBeenCalledTimes(2); // No transaction creation call
    });

    it('should handle no budgets found for reconciliation', async () => {
      const mockBudgetsResponse = {
        data: { budgets: [] },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBudgetsResponse),
      } as Response);

      await expect(
        service.reconcileAccountBalance('test-token', 'account-123', 1500),
      ).rejects.toThrow('Failed to reconcile account balance');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors during reconciliation', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      await expect(
        service.reconcileAccountBalance('invalid-token', 'account-123', 1500),
      ).rejects.toThrow('Failed to reconcile account balance');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle account fetch errors during reconciliation', async () => {
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
          status: 404,
        } as Response);

      await expect(
        service.reconcileAccountBalance('test-token', 'invalid-account', 1500),
      ).rejects.toThrow('Failed to reconcile account balance');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle transaction creation errors during reconciliation', async () => {
      const mockBudgetsResponse = {
        data: {
          budgets: [{ id: 'budget-123' }],
        },
      };

      const mockAccountResponse = {
        data: {
          account: {
            id: 'account-123',
            balance: 1000000, // $1000.00 in milliunits
          },
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
          json: () => Promise.resolve(mockAccountResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
        } as Response);

      await expect(
        service.reconcileAccountBalance('test-token', 'account-123', 1500),
      ).rejects.toThrow('Failed to reconcile account balance');
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });
});
