import { ApiClient } from './api-client';
import { DatabaseManager } from './database-manager';
import { TestData } from './test-data';

type PlaygroundMode = 'database' | 'file-sync' | 'both';

interface ExecutionStep {
  message: string;
  executor: () => Promise<void>;
}

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

  async run(mode: PlaygroundMode = 'database'): Promise<void> {
    const steps: ExecutionStep[] = [];

    console.log('\n� Starting API Playground...');

    steps.push({
      message: 'Checking database',
      executor: () => this.checkDatabaseStatus(),
    });

    steps.push({
      message: 'Preparing database',
      executor: () => this.dbManager.resetDatabase(),
    });

    steps.push({
      message: 'Testing API health',
      executor: () => this.testApiHealth(),
    });

    steps.push({
      message: 'Creating user settings',
      executor: () => this.testUserSettings(),
    });

    steps.push({
      message: 'Testing YNAB integration',
      executor: () => this.testYnabIntegration(),
    });

    if (mode === 'database' || mode === 'both') {
      steps.push({
        message: 'Adding investment assets',
        executor: () => this.testAssetManagement(),
      });

      steps.push({
        message: 'Triggering sync process',
        executor: () => this.testSyncProcess(),
      });
    }

    // File-based sync
    if (mode === 'file-sync' || mode === 'both') {
      steps.push({
        message: 'Testing file sync',
        executor: () => this.testFileSyncProcess(),
      });
    }

    steps.push({
      message: 'Validating YNAB results',
      executor: () => this.validateYnabResults(),
    });

    steps.push({
      message: 'Cleaning up',
      executor: () => this.dbManager.resetDatabase(),
    });

    for (const [index, { message, executor }] of steps.entries()) {
      console.log(`\n🔄 Step ${index + 1}: ${message}`);
      await executor();
    }

    console.log('\n🎉 API Playground completed successfully!');
  }

  private async checkDatabaseStatus() {
    // Check initial database status
    const { healthy, running, url } = await this.dbManager.getDatabaseStatus();

    if (!healthy || !running) {
      console.error(`❌ Database is either unhealthy or not running. (${url})`);

      throw new Error('Aborting');
    }

    console.log(`📊 Initial database status: '✅ Healthy'} (${url})`);
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

  private async testFileSyncProcess(): Promise<void> {
    try {
      console.log('📄 Testing file sync process...');

      // Check if file sync URL is configured
      const fileUrl = process.env.INVESTMENTS_CONFIG_FILE_URL;
      if (!fileUrl) {
        console.log('⚠️  INVESTMENTS_CONFIG_FILE_URL not configured, skipping file sync test');
        return;
      }

      console.log('🌐 Config file URL:', fileUrl);
      console.log('🔄 Triggering manual file sync...');

      const fileSyncResult = await this.apiClient.triggerFileSync();
      console.log('✅ File sync completed:', fileSyncResult.message);

      // Wait a moment for file sync to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify that assets were potentially updated
      const allAssets = await this.apiClient.getAllAssets();
      console.log('📊 Total assets after file sync:', allAssets.length);
    } catch (error) {
      // File sync might fail if URL is not accessible, log warning but don't fail the whole test
      console.warn(
        '⚠️  File sync test failed (this may be expected if URL is not accessible):',
        error.message,
      );
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

  private getValidationStepNumber(mode: PlaygroundMode): number {
    if (mode === 'database') return 7;
    if (mode === 'file-sync') return 6;
    return 8; // both
  }

  private getCleanupStepNumber(mode: PlaygroundMode): number {
    if (mode === 'database') return 8;
    if (mode === 'file-sync') return 7;
    return 9; // both
  }
}
