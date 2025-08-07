import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { YnabService } from './ynab.service';

describe('YnabService', () => {
  let service: YnabService;
  let originalFetch: typeof global.fetch;

  const mockBudgetResponse = {
    data: {
      budgets: [
        {
          id: 'budget-1',
          name: 'Test Budget',
          last_modified_on: '2024-01-01T00:00:00Z',
          first_month: '2024-01',
          last_month: '2024-12',
          currency_format: {
            iso_code: 'USD',
          },
        },
      ],
    },
  };

  const mockAccountsResponse = {
    data: {
      accounts: [
        {
          id: 'account-1',
          name: 'Test Account',
          type: 'checking',
          balance: 100000, // YNAB uses milliunits
        },
      ],
    },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [YnabService],
    }).compile();

    service = moduleRef.get(YnabService);

    // Mock fetch globally
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBudgets', () => {
    it('should fetch and return budgets successfully', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBudgetResponse),
      } as Response);

      const result = await service.getBudgets('test-token');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.youneedabudget.com/v1/budgets',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        }),
      );

      expect(result).toEqual([
        {
          id: 'budget-1',
          name: 'Test Budget',
          currency: 'USD',
          lastModifiedOn: new Date('2024-01-01T00:00:00Z'),
          firstMonth: '2024-01',
          lastMonth: '2024-12',
        },
      ]);
    });

    it('should return empty array when no budgets exist', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { budgets: [] } }),
      } as Response);

      const result = await service.getBudgets('test-token');

      expect(result).toEqual([]);
    });

    it('should handle HTTP errors', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);

      await expect(service.getBudgets('test-token')).rejects.toThrow(
        'Failed to fetch YNAB budgets',
      );
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await expect(service.getBudgets('test-token')).rejects.toThrow(
        'Failed to fetch YNAB budgets',
      );
    });

    it('should handle missing currency format', async () => {
      const budgetWithoutCurrency = {
        data: {
          budgets: [
            {
              id: 'budget-1',
              name: 'Test Budget',
              last_modified_on: '2024-01-01T00:00:00Z',
              first_month: '2024-01',
              last_month: '2024-12',
            },
          ],
        },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(budgetWithoutCurrency),
      } as Response);

      const result = await service.getBudgets('test-token');

      expect(result[0].currency).toBe('USD'); // Should default to USD
    });
  });

  describe('getAccounts', () => {
    it('should fetch accounts for specific budget', async () => {
      // Mock the budget details call
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                budget: {
                  currency_format: {
                    iso_code: 'USD',
                  },
                },
              },
            }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccountsResponse),
        } as Response);

      const result = await service.getAccounts('test-token', 'budget-1');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.youneedabudget.com/v1/budgets/budget-1',
        expect.any(Object),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.youneedabudget.com/v1/budgets/budget-1/accounts',
        expect.any(Object),
      );

      expect(result).toEqual([
        {
          id: 'account-1',
          name: 'Test Account',
          type: 'checking',
          balance: 100, // Should be converted from milliunits (100000 / 1000)
          currency: 'USD',
        },
      ]);
    });

    it('should use first budget when no budgetId provided', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBudgetResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccountsResponse),
        } as Response);

      const result = await service.getAccounts('test-token');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.youneedabudget.com/v1/budgets',
        expect.any(Object),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.youneedabudget.com/v1/budgets/budget-1/accounts',
        expect.any(Object),
      );

      expect(result).toHaveLength(1);
    });

    it('should throw error when no budgets exist and no budgetId provided', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { budgets: [] } }),
      } as Response);

      await expect(service.getAccounts('test-token')).rejects.toThrow(
        'Failed to fetch YNAB accounts',
      );
    });

    it('should handle HTTP errors', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      await expect(service.getAccounts('test-token', 'budget-1')).rejects.toThrow(
        'Failed to fetch YNAB accounts',
      );
    });
  });
});
