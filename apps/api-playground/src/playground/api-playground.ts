import { ApiClient } from './api-client';

interface ExecutionStep {
  message: string;
  executor: () => Promise<void>;
}

export class ApiPlayground {
  private apiClient: ApiClient;
  private readonly apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
    this.apiClient = new ApiClient(this.apiBaseUrl);
  }

  getConfigFileUrl(): string | undefined {
    return process.env.INVESTMENTS_CONFIG_FILE_URL;
  }

  async run(): Promise<void> {
    const steps: ExecutionStep[] = [];

    console.log('\n🚀 Starting YNAB Investments Sync Playground...');
    console.log('This playground tests the file-based sync functionality with YNAB.');

    steps.push({
      message: 'Testing API health',
      executor: () => this.testApiHealth(),
    });

    steps.push({
      message: 'Testing manual file sync trigger',
      executor: () => this.testFileSyncProcess(),
    });

    for (const [index, { message, executor }] of steps.entries()) {
      console.log(`\n🔄 Step ${index + 1}: ${message}`);
      await executor();
    }

    console.log('\n🎉 YNAB Investments Sync Playground completed successfully!');
    console.log('\n💡 The app will automatically:');
    console.log('   • Fetch the investment config file daily at 8 PM');
    console.log('   • Sync with YNAB when the config changes or on the configured schedule');
    console.log('   • Use real-time market data to calculate portfolio values');
  }

  private async testApiHealth() {
    try {
      const healthStatus = await this.apiClient.getHealth();
      console.log('✅ API is healthy:', healthStatus);
    } catch (error) {
      console.error('❌ API health check failed:', error.message);
      throw error;
    }
  }

  private async testFileSyncProcess() {
    const configUrl = this.getConfigFileUrl();

    if (!configUrl) {
      console.log('⚠️  INVESTMENTS_CONFIG_FILE_URL not set, skipping file sync test');
      return;
    }

    try {
      console.log(`🔄 Triggering manual file sync for config: ${configUrl}`);

      const response = await this.apiClient.triggerFileSync();
      console.log('✅ File sync completed:', response.message);

      console.log('📋 The sync process:');
      console.log('   1. Fetched fresh investment config file');
      console.log('   2. Parsed account holdings and asset symbols');
      console.log('   3. Retrieved current market prices for all assets');
      console.log('   4. Calculated total portfolio values');
      console.log('   5. Updated YNAB account balances');
    } catch (error) {
      console.error('❌ File sync failed:', error.message);
      if (error.message.includes('INVESTMENTS_CONFIG_FILE_URL')) {
        console.log('💡 Make sure INVESTMENTS_CONFIG_FILE_URL is set in your environment');
      }
      if (error.message.includes('YNAB_API_KEY')) {
        console.log('💡 Make sure YNAB_API_KEY is set in your environment');
      }
    }
  }
}
