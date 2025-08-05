import { Injectable, Logger } from '@nestjs/common';

import { YnabAccountDto } from './dto';

interface YnabApiAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
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

  async getAccounts(token: string): Promise<YnabAccountDto[]> {
    try {
      this.setAuthHeader(token);
      const response = await this.fetchWithAuth('/budgets');
      const data = await response.json();

      // Get the first budget (assuming single budget setup)
      const budgets = data.data.budgets;
      if (!budgets || budgets.length === 0) {
        throw new Error('No budgets found in YNAB account');
      }

      const budgetId = budgets[0].id;
      const accountsResponse = await this.fetchWithAuth(`/budgets/${budgetId}/accounts`);
      const accountsData = await accountsResponse.json();

      return accountsData.data.accounts.map((account: YnabApiAccount) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance / 1000, // YNAB stores amounts in milliunits
        currency: budgets[0].currency_format?.iso_code || 'USD',
      }));
    } catch (error) {
      this.logger.error('Failed to fetch YNAB accounts', error);
      throw new Error('Failed to fetch YNAB accounts');
    }
  }

  async updateAccountBalance(token: string, accountId: string, balance: number): Promise<void> {
    try {
      this.setAuthHeader(token);

      // Get budget ID first
      const budgetsResponse = await this.fetchWithAuth('/budgets');
      const budgetsData = await budgetsResponse.json();
      const budgets = budgetsData.data.budgets;
      if (!budgets || budgets.length === 0) {
        throw new Error('No budgets found in YNAB account');
      }

      const budgetId = budgets[0].id;

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

      await this.fetchWithAuth(`/budgets/${budgetId}/transactions`, {
        method: 'POST',
        body: JSON.stringify({ transaction }),
      });

      this.logger.log(`Successfully updated account ${accountId} balance to ${balance}`);
    } catch (error) {
      this.logger.error(`Failed to update account ${accountId} balance`, error);
      throw new Error(`Failed to update account balance: ${error.message}`);
    }
  }
}
