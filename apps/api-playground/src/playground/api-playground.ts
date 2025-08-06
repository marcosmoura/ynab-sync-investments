import { ApiClient } from './api-client';
import { DatabaseManager } from './database-manager';
import { TestData } from './test-data';

export class ApiPlayground {
  private apiClient: ApiClient;
  private testData: TestData;
  private dbManager: DatabaseManager;
  private readonly apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
    this.apiClient = new ApiClient(this.apiBaseUrl);
    this.testData = new TestData();
    this.dbManager = new DatabaseManager();
  }

  async run(): Promise<void> {
    console.log('\n� Starting API Playground...');

    // Check initial database status
    const initialStatus = await this.dbManager.getDatabaseStatus();
    console.log(
      `📊 Initial database status: ${initialStatus.healthy ? '✅ Healthy' : '❌ Unhealthy'} (${initialStatus.url})`,
    );

    console.log('\n�🔄 Step 1: Preparing database');
    await this.dbManager.resetDatabase();

    console.log('\n🔄 Step 2: Testing API health');
    await this.testApiHealth();

    console.log('\n🔄 Step 3: Creating user settings');
    await this.testUserSettings();

    console.log('\n🔄 Step 4: Testing YNAB integration');
    await this.testYnabIntegration();

    console.log('\n🔄 Step 5: Adding investment assets');
    await this.testAssetManagement();

    console.log('\n🔄 Step 6: Triggering sync process');
    await this.testSyncProcess();

    console.log('\n🔄 Step 7: Validating YNAB results');
    await this.validateYnabResults();

    console.log('\n🔄 Step 8: Cleaning up');
    await this.dbManager.resetDatabase();

    console.log('\n🎉 API Playground completed successfully!');
  }

  private async testApiHealth(): Promise<void> {
    try {
      const health = await this.apiClient.getHealth();
      console.log('✅ API is healthy:', health);
    } catch (error) {
      throw new Error(`API health check failed: ${error}`);
    }
  }

  private async testUserSettings(): Promise<void> {
    const userSettings = this.testData.getUserSettings();

    try {
      const created = await this.apiClient.createUserSettings(userSettings);
      console.log('✅ User settings created:', {
        syncSchedule: created.syncSchedule,
        targetBudgetId: created.targetBudgetId,
        hasToken: !!created.ynabApiToken,
      });

      const retrieved = await this.apiClient.getUserSettings();
      console.log('✅ User settings retrieved successfully');

      if (!retrieved || retrieved.ynabApiToken !== userSettings.ynabApiToken) {
        throw new Error('User settings not properly stored');
      }
    } catch (error) {
      throw new Error(`User settings test failed: ${error}`);
    }
  }

  private async testYnabIntegration(): Promise<void> {
    const { ynabApiToken, targetBudgetId } = this.testData.getUserSettings();

    try {
      // Test getting budgets
      const budgets = await this.apiClient.getYnabBudgets(ynabApiToken);
      console.log('✅ YNAB budgets retrieved:', budgets.length, 'budgets found');

      // Test getting accounts
      const accounts = await this.apiClient.getYnabAccounts(ynabApiToken, targetBudgetId);
      console.log('✅ YNAB accounts retrieved:', accounts.length, 'accounts found');

      // Verify our test accounts exist
      const cryptoAccount = accounts.find((acc) => acc.id === process.env.YNAB_CRYPTO_ACCOUNT_ID);
      const investmentAccount = accounts.find(
        (acc) => acc.id === process.env.YNAB_INVESTMENTS_ACCOUNT_ID,
      );

      if (!cryptoAccount || !investmentAccount) {
        throw new Error('Required YNAB test accounts not found');
      }

      console.log('✅ Found crypto account:', cryptoAccount.name);
      console.log('✅ Found investment account:', investmentAccount.name);
    } catch (error) {
      throw new Error(`YNAB integration test failed: ${error}`);
    }
  }

  private async testAssetManagement(): Promise<void> {
    const cryptoAssets = this.testData.getCryptoAssets();
    const investmentAssets = this.testData.getInvestmentAssets();
    const allAssets = [...cryptoAssets, ...investmentAssets];

    try {
      // Create all assets
      const createdAssets = [];
      for (const asset of allAssets) {
        const created = await this.apiClient.createAsset(asset);
        createdAssets.push(created);
        console.log(
          `✅ Created asset: ${created.symbol} (${created.amount}) -> ${created.ynabAccountId}`,
        );
      }

      // Verify assets were created
      const allStoredAssets = await this.apiClient.getAllAssets();
      console.log('✅ Total assets stored:', allStoredAssets.length);

      // Test filtering by account
      const cryptoAccountId = process.env.YNAB_CRYPTO_ACCOUNT_ID;
      const investmentAccountId = process.env.YNAB_INVESTMENTS_ACCOUNT_ID;

      if (!cryptoAccountId || !investmentAccountId) {
        throw new Error('Required YNAB account IDs not configured');
      }

      const cryptoAccountAssets = await this.apiClient.getAssetsByAccount(cryptoAccountId);
      const investmentAccountAssets = await this.apiClient.getAssetsByAccount(investmentAccountId);

      console.log('✅ Crypto assets:', cryptoAccountAssets.length);
      console.log('✅ Investment assets:', investmentAccountAssets.length);

      if (cryptoAccountAssets.length !== cryptoAssets.length) {
        throw new Error('Crypto assets count mismatch');
      }

      if (investmentAccountAssets.length !== investmentAssets.length) {
        throw new Error('Investment assets count mismatch');
      }
    } catch (error) {
      throw new Error(`Asset management test failed: ${error}`);
    }
  }

  private async testSyncProcess(): Promise<void> {
    try {
      console.log('🔄 Triggering manual sync...');
      const syncResult = await this.apiClient.triggerSync();
      console.log('✅ Sync completed:', syncResult.message);

      // Wait a moment for sync to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      throw new Error(`Sync process test failed: ${error}`);
    }
  }

  private async validateYnabResults(): Promise<void> {
    const { ynabApiToken, targetBudgetId } = this.testData.getUserSettings();

    try {
      console.log('🔍 Validating YNAB account balances...');

      const accounts = await this.apiClient.getYnabAccounts(ynabApiToken, targetBudgetId);
      const cryptoAccount = accounts.find((acc) => acc.id === process.env.YNAB_CRYPTO_ACCOUNT_ID);
      const investmentAccount = accounts.find(
        (acc) => acc.id === process.env.YNAB_INVESTMENTS_ACCOUNT_ID,
      );

      if (!cryptoAccount || !investmentAccount) {
        throw new Error('Cannot find accounts for validation');
      }

      console.log('💰 Crypto account balance:', cryptoAccount.balance, cryptoAccount.currency);
      console.log(
        '💰 Investment account balance:',
        investmentAccount.balance,
        investmentAccount.currency,
      );

      // Validate that balances are reasonable (greater than 0 after sync)
      if (cryptoAccount.balance <= 0) {
        console.warn('⚠️  Crypto account balance is zero or negative - may indicate sync issues');
      }

      if (investmentAccount.balance <= 0) {
        console.warn(
          '⚠️  Investment account balance is zero or negative - may indicate sync issues',
        );
      }

      console.log('✅ YNAB validation completed');
    } catch (error) {
      throw new Error(`YNAB validation failed: ${error}`);
    }
  }
}
