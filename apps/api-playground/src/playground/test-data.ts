import { CreateAssetDto, CreateUserSettingsDto } from './api-client';

export class TestData {
  getUserSettings(): CreateUserSettingsDto {
    const ynabApiToken = process.env.YNAB_API_KEY;
    const targetBudgetId = process.env.YNAB_BUDGET_ID;

    if (!ynabApiToken) {
      throw new Error('YNAB_API_KEY environment variable is required');
    }

    if (!targetBudgetId) {
      throw new Error('YNAB_BUDGET_ID environment variable is required');
    }

    return {
      ynabApiToken,
      syncSchedule: 'daily', // SyncSchedule.DAILY
      targetBudgetId,
    };
  }

  getCryptoAssets(): CreateAssetDto[] {
    const cryptoAccountId = process.env.YNAB_CRYPTO_ACCOUNT_ID;

    if (!cryptoAccountId) {
      throw new Error('YNAB_CRYPTO_ACCOUNT_ID environment variable is required');
    }

    return [
      {
        symbol: 'BTC',
        amount: 0.32,
        ynabAccountId: cryptoAccountId,
      },
      {
        symbol: 'ETH',
        amount: 1.5,
        ynabAccountId: cryptoAccountId,
      },
      {
        symbol: 'NEXO',
        amount: 1000,
        ynabAccountId: cryptoAccountId,
      },
    ];
  }

  getInvestmentAssets(): CreateAssetDto[] {
    const investmentAccountId = process.env.YNAB_INVESTMENTS_ACCOUNT_ID;

    if (!investmentAccountId) {
      throw new Error('YNAB_INVESTMENTS_ACCOUNT_ID environment variable is required');
    }

    return [
      {
        symbol: 'AAPL',
        amount: 10,
        ynabAccountId: investmentAccountId,
      },
      {
        symbol: 'MSFT',
        amount: 150,
        ynabAccountId: investmentAccountId,
      },
      {
        symbol: 'VOO',
        amount: 15,
        ynabAccountId: investmentAccountId,
      },
      {
        symbol: 'NVDA',
        amount: 8,
        ynabAccountId: investmentAccountId,
      },
      {
        symbol: 'NQSE.DE',
        amount: 20,
        ynabAccountId: investmentAccountId,
      },
    ];
  }

  getAllAssets(): CreateAssetDto[] {
    return [...this.getCryptoAssets(), ...this.getInvestmentAssets()];
  }
}
