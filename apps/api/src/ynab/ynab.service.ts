import { Injectable, Logger } from '@nestjs/common';

import { YnabAccountDto, YnabBudgetDto } from './dto';

interface YnabApiAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface YnabApiBudget {
  id: string;
  name: string;
  last_modified_on: string;
  first_month: string;
  last_month: string;
  currency_format: {
    iso_code: string;
  };
}

@Injectable()
export class YnabService {
  private readonly logger = new Logger(YnabService.name);
  private readonly baseURL = 'https://api.youneedabudget.com/v1';
  private authHeader = '';

  private setAuthHeader(token: string): void {
    this.authHeader = `Bearer ${token}`;
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  }

  async getBudgets(token: string): Promise<YnabBudgetDto[]> {
    try {
      this.setAuthHeader(token);
      const response = await this.fetchWithAuth('/budgets');
      const data = await response.json();

      const budgets = data.data.budgets;
      if (!budgets || budgets.length === 0) {
        return [];
      }

      return budgets.map((budget: YnabApiBudget) => ({
        id: budget.id,
        name: budget.name,
        currency: budget.currency_format?.iso_code || 'USD',
        lastModifiedOn: new Date(budget.last_modified_on),
        firstMonth: budget.first_month,
        lastMonth: budget.last_month,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch YNAB budgets', error);
      throw new Error('Failed to fetch YNAB budgets');
    }
  }

  getCurrencyFromBudgetsResponse(budgets: YnabBudgetDto[]): string {
    return budgets[0]?.currency || 'USD';
  }

  async getBudgetCurrency(token: string, targetBudgetId: string): Promise<string> {
    this.setAuthHeader(token);

    try {
      const response = await this.fetchWithAuth(`/budgets/${targetBudgetId}`);
      const data = await response.json();

      return data.data.budget.currency_format?.iso_code || 'USD';
    } catch (error) {
      this.logger.error('Failed to fetch YNAB budget currency', error);
      throw new Error('Failed to fetch YNAB budget currency');
    }
  }

  async getAccounts(token: string, budgetId?: string): Promise<YnabAccountDto[]> {
    try {
      this.setAuthHeader(token);

      let targetBudgetId = budgetId;
      let budgetCurrency = 'USD';

      if (!targetBudgetId) {
        // Fall back to first budget if no budgetId provided
        const budgets = await this.getBudgets(token);

        if (!budgets || budgets.length === 0) {
          throw new Error('No budgets found in YNAB account');
        }

        targetBudgetId = budgets[0].id;
        budgetCurrency = budgets[0].currency || 'USD';
      } else {
        // Get the specific budget details for currency
        budgetCurrency = await this.getBudgetCurrency(token, targetBudgetId);
      }

      const accountsResponse = await this.fetchWithAuth(`/budgets/${targetBudgetId}/accounts`);
      const accountsData = await accountsResponse.json();

      return accountsData.data.accounts.map((account: YnabApiAccount) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance / 1000, // YNAB stores amounts in milliunits
        currency: budgetCurrency,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch YNAB accounts', error);
      throw new Error('Failed to fetch YNAB accounts');
    }
  }

  async updateAccountBalance(
    token: string,
    accountId: string,
    balance: number,
    budgetId?: string,
  ): Promise<void> {
    try {
      this.setAuthHeader(token);

      let targetBudgetId = budgetId;

      if (!targetBudgetId) {
        // Get budget ID first if not provided
        const budgetsResponse = await this.fetchWithAuth('/budgets');
        const budgetsData = await budgetsResponse.json();
        const budgets = budgetsData.data.budgets;
        if (!budgets || budgets.length === 0) {
          throw new Error('No budgets found in YNAB account');
        }
        targetBudgetId = budgets[0].id;
      }

      // Create an adjustment transaction to update the account balance
      const balanceInMilliunits = Math.round(balance * 1000); // Convert to YNAB milliunits

      const transaction = {
        account_id: accountId,
        amount: balanceInMilliunits,
        payee_name: 'Investment Sync',
        memo: 'Automated investment portfolio sync',
        cleared: 'cleared',
        approved: true,
        date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      };

      await this.fetchWithAuth(`/budgets/${targetBudgetId}/transactions`, {
        method: 'POST',
        body: JSON.stringify({ transaction }),
      });

      this.logger.log(`Successfully updated account ${accountId} balance to ${balance}`);
    } catch (error) {
      this.logger.error(`Failed to update account ${accountId} balance`, error);
      throw new Error(`Failed to update account balance: ${error.message}`);
    }
  }

  async reconcileAccountBalance(
    token: string,
    accountId: string,
    targetBalance: number,
    budgetId?: string,
    assetSymbols?: string[],
  ): Promise<void> {
    try {
      this.setAuthHeader(token);

      let targetBudgetId = budgetId;

      if (!targetBudgetId) {
        // Get budget ID first if not provided
        const budgetsResponse = await this.fetchWithAuth('/budgets');
        const budgetsData = await budgetsResponse.json();
        const budgets = budgetsData.data.budgets;
        if (!budgets || budgets.length === 0) {
          throw new Error('No budgets found in YNAB account');
        }
        targetBudgetId = budgets[0].id;
      }

      // Get current account details to check current balance
      const accountsResponse = await this.fetchWithAuth(
        `/budgets/${targetBudgetId}/accounts/${accountId}`,
      );
      const accountData = await accountsResponse.json();
      const currentBalance = accountData.data.account.balance / 1000; // Convert from milliunits

      // Calculate the difference (reconciliation amount)
      const reconciliationAmount = targetBalance - currentBalance;

      // Only create a transaction if there's a meaningful difference (avoid tiny rounding differences)
      if (Math.abs(reconciliationAmount) < 0.01) {
        this.logger.log(
          `Account ${accountId} is already reconciled (difference: ${reconciliationAmount})`,
        );
        return;
      }

      const reconciliationAmountInMilliunits = Math.round(reconciliationAmount * 1000);

      // Create a comprehensive memo with current balance, target balance, adjustment amount, and asset symbols
      const balanceInfo = `${currentBalance.toFixed(2)} → ${targetBalance.toFixed(2)}`;
      const assetInfo = assetSymbols?.length > 0 ? ` (${assetSymbols?.join(', ')})` : '';
      const memo = `${balanceInfo}${assetInfo}`;

      const transaction = {
        account_id: accountId,
        amount: reconciliationAmountInMilliunits,
        payee_name: 'Investment Portfolio Reconciliation',
        memo,
        cleared: 'cleared',
        approved: true,
        date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      };

      await this.fetchWithAuth(`/budgets/${targetBudgetId}/transactions`, {
        method: 'POST',
        body: JSON.stringify({ transaction }),
      });

      this.logger.log(
        `Successfully reconciled account ${accountId}: ${currentBalance.toFixed(2)} → ${targetBalance.toFixed(2)} (${reconciliationAmount >= 0 ? '+' : ''}${reconciliationAmount.toFixed(2)})`,
      );
    } catch (error) {
      this.logger.error(`Failed to reconcile account ${accountId} balance`, error);
      throw new Error(`Failed to reconcile account balance: ${error.message}`);
    }
  }
}
