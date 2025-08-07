import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as yaml from 'js-yaml';

import { MarketDataService } from '@/market-data/market-data.service';
import { YnabService } from '@/ynab/ynab.service';

interface YamlConfig {
  budget: string;
  schedule?: {
    // New format
    sync_time?: string; // Time to sync (e.g., "9pm", "21:00")
    sync_frequency?: 'daily' | 'weekly' | 'monthly'; // How often to sync
    // Legacy format (for backward compatibility)
    cron?: string; // Custom cron expression for YNAB sync
    timezone?: string;
  };
  accounts: Array<{
    account_id: string;
    holdings: Record<string, number>;
  }>;
}

interface CachedConfig {
  config: YamlConfig;
  fetchedAt: Date;
  lastSyncAt?: Date;
  hash: string;
}

@Injectable()
export class FileSyncService implements OnModuleInit {
  private readonly logger = new Logger(FileSyncService.name);
  private cachedConfig: CachedConfig | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly ynabService: YnabService,
    private readonly marketDataService: MarketDataService,
  ) {}

  async onModuleInit() {
    // Fetch initial config on startup
    await this.fetchAndCacheConfig();
  }

  @Cron(CronExpression.EVERY_DAY_AT_9PM, {
    name: 'daily-config-fetch',
    timeZone: 'UTC',
  })
  async handleScheduledConfigFetch(): Promise<void> {
    try {
      this.logger.log('Scheduled config fetch triggered');
      await this.fetchAndCacheConfig();
    } catch (error) {
      this.logger.error('Error during scheduled config fetch', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9PM, {
    name: 'weekly-ynab-sync',
    timeZone: 'UTC',
  }) // Weekly on Sunday at 9 PM UTC
  async handleWeeklyYnabSync(): Promise<void> {
    try {
      this.logger.log('Weekly YNAB sync check triggered');
      await this.handleScheduledYnabSync();
    } catch (error) {
      this.logger.error('Error during weekly YNAB sync', error);
    }
  }

  async fetchAndCacheConfig(): Promise<void> {
    try {
      const configFileUrl = this.configService.get<string>('INVESTMENTS_CONFIG_FILE_URL');

      if (!configFileUrl) {
        this.logger.warn('INVESTMENTS_CONFIG_FILE_URL not configured, skipping config fetch');
        return;
      }

      this.logger.log(`Fetching config from URL: ${configFileUrl}`);

      const fileContent = await this.fetchConfigFile(configFileUrl);
      if (!fileContent) {
        return;
      }

      const config = this.parseConfigFile(fileContent);
      if (!config) {
        return;
      }

      const contentHash = this.generateHash(fileContent);
      const isFirstFetch = !this.cachedConfig;
      const hasChanged = this.cachedConfig?.hash !== contentHash;

      // Update cached config
      this.cachedConfig = {
        config,
        fetchedAt: new Date(),
        hash: contentHash,
        lastSyncAt: this.cachedConfig?.lastSyncAt,
      };

      this.logger.log(
        `Config cached successfully. First fetch: ${isFirstFetch}, Changed: ${hasChanged}`,
      );

      // Setup or update the YNAB sync schedule
      this.setupYnabSyncSchedule(config);

      // Trigger YNAB sync if it's the first fetch or if the config changed
      if (isFirstFetch || hasChanged) {
        // Only fetch initial config on startup in production
        const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

        if (nodeEnv === 'production') {
          this.logger.log('Triggering YNAB sync due to config change or first fetch');
          await this.performYnabSync();

          await this.fetchAndCacheConfig();
        } else {
          this.logger.log('Development mode: Skipping automatic config fetch on startup');
        }
      }
    } catch (error) {
      this.logger.error('Error fetching and caching config', error);
      throw error;
    }
  }

  private async fetchConfigFile(configFileUrl: string): Promise<string | null> {
    try {
      const cacheBustUrl = `${configFileUrl}${configFileUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;

      const response = await fetch(cacheBustUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });

      if (!response.ok) {
        this.logger.warn(`Failed to fetch config file: ${response.status} ${response.statusText}`);
        return null;
      }

      return await response.text();
    } catch (error) {
      this.logger.warn(`Config file could not be fetched: ${error.message}`);
      return null;
    }
  }

  private parseConfigFile(fileContent: string): YamlConfig | null {
    try {
      const config = yaml.load(fileContent) as YamlConfig;

      if (!config || !config.accounts || !Array.isArray(config.accounts)) {
        this.logger.error('Invalid config file format: missing accounts array');
        return null;
      }

      if (!config.budget) {
        this.logger.error('Invalid config file format: missing budget');
        return null;
      }

      return config;
    } catch (error) {
      this.logger.error('Failed to parse config file', error);
      return null;
    }
  }

  private generateHash(content: string): string {
    // Simple hash function for content comparison
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  private setupYnabSyncSchedule(config: YamlConfig): void {
    try {
      // Log the YNAB sync configuration
      let customCron = config.schedule?.cron;
      const timezone = config.schedule?.timezone || 'UTC';

      // Handle new format (sync_time + sync_frequency)
      if (!customCron && config.schedule?.sync_time && config.schedule?.sync_frequency) {
        customCron = this.convertScheduleToCron(
          config.schedule.sync_time,
          config.schedule.sync_frequency,
        );
      }

      if (customCron) {
        if (this.isValidSyncCron(customCron)) {
          if (config.schedule?.sync_time && config.schedule?.sync_frequency) {
            this.logger.log(
              `Custom YNAB sync schedule configured: ${config.schedule.sync_frequency} at ${config.schedule.sync_time} (converted to: ${customCron}, timezone: ${timezone})`,
            );
          } else {
            this.logger.log(
              `Custom YNAB sync schedule configured: ${customCron} (timezone: ${timezone})`,
            );
          }
          this.logger.log('Note: Custom scheduling will be checked by the weekly sync job');
        } else {
          this.logger.warn(
            'Custom sync schedule allows too frequent execution, using default weekly schedule',
          );
        }
      } else {
        this.logger.log('Using default weekly YNAB sync schedule (Sunday 9 PM UTC)');
      }
    } catch (error) {
      this.logger.error('Error setting up YNAB sync schedule', error);
    }
  }

  private isValidSyncCron(cronExpression: string): boolean {
    try {
      // Basic validation for cron expression format
      const parts = cronExpression.split(' ');

      // A cron expression should have 5 or 6 parts
      if (parts.length < 5 || parts.length > 6) {
        return false;
      }

      // Simple check: if minute is '*', it might run too frequently
      // For safety, we'll only allow specific minute values or ranges
      const minute = parts[0];
      if (minute === '*') {
        this.logger.warn('Cron expression with wildcard minute (*) not allowed for safety');
        return false;
      }

      // Additional safety: if hour is '*', it's definitely too frequent
      const hour = parts[1];
      if (hour === '*') {
        this.logger.warn('Cron expression with wildcard hour (*) not allowed for safety');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(`Invalid cron expression: ${cronExpression}`, error);
      return false;
    }
  }

  private async handleScheduledYnabSync(): Promise<void> {
    try {
      if (!this.cachedConfig) {
        this.logger.warn('No cached config available for scheduled YNAB sync');
        return;
      }

      const now = new Date();
      const lastSync = this.cachedConfig.lastSyncAt;

      // Ensure minimum 24-hour gap between syncs
      if (lastSync) {
        const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSync < 24) {
          this.logger.log(
            `Skipping YNAB sync - last sync was ${hoursSinceLastSync.toFixed(1)} hours ago`,
          );
          return;
        }
      }

      this.logger.log('Scheduled YNAB sync triggered');
      await this.performYnabSync();
    } catch (error) {
      this.logger.error('Error during scheduled YNAB sync', error);
    }
  }

  private async performYnabSync(): Promise<void> {
    try {
      if (!this.cachedConfig) {
        throw new Error('No cached config available for YNAB sync');
      }

      const { config } = this.cachedConfig;
      const ynabToken = this.configService.get<string>('YNAB_API_KEY');

      if (!ynabToken) {
        throw new Error('YNAB_API_KEY not configured');
      }

      this.logger.log(`Starting YNAB sync for budget: ${config.budget}`);
      this.logger.log(`Processing ${config.accounts.length} accounts`);

      // Process each account
      for (const account of config.accounts) {
        try {
          const holdings = account.holdings;
          const symbols = Object.keys(holdings);

          this.logger.log(
            `Processing account ${account.account_id} with holdings: ${symbols.join(', ')}`,
          );

          // Get current market prices for all assets in this account
          const assetPrices = await this.marketDataService.getAssetPrices(symbols, 'USD', true);

          // Calculate total portfolio value for this account
          let totalValue = 0;

          for (const symbol of symbols) {
            const quantity = holdings[symbol];
            const assetPrice = assetPrices.find((price) => price.symbol === symbol);

            if (assetPrice) {
              const assetValue = quantity * assetPrice.price;
              totalValue += assetValue;
              this.logger.log(
                `  ${symbol}: ${quantity} × $${assetPrice.price} = $${assetValue.toFixed(2)}`,
              );
            } else {
              this.logger.warn(`  ${symbol}: Price not found, assuming $0 value`);
            }
          }

          this.logger.log(`Account ${account.account_id} total value: $${totalValue.toFixed(2)}`);

          // Update account balance in YNAB
          await this.ynabService.reconcileAccountBalance(
            ynabToken,
            account.account_id,
            totalValue,
            config.budget,
            symbols,
          );

          this.logger.log(`Successfully synced account ${account.account_id}`);
        } catch (error) {
          this.logger.error(`Failed to sync account ${account.account_id}`, error);
          // Continue with other accounts even if one fails
        }
      }

      // Update last sync time
      this.cachedConfig.lastSyncAt = new Date();

      this.logger.log('YNAB sync completed successfully');
    } catch (error) {
      this.logger.error('Error during YNAB sync', error);
      throw error;
    }
  }

  async triggerManualFileSync(): Promise<void> {
    this.logger.log('Manual file sync triggered - fetching fresh config and performing sync');

    // Fetch fresh config
    await this.fetchAndCacheConfig();

    // Always perform YNAB sync on manual trigger
    await this.performYnabSync();
  }

  // Utility method to get current cached config (for debugging/monitoring)
  getCachedConfig(): CachedConfig | null {
    return this.cachedConfig;
  }

  private convertScheduleToCron(syncTime: string, syncFrequency: string): string {
    // Parse time (supports formats like "9pm", "21:00", "9:00 PM", etc.)
    const hour = this.parseTimeToHour(syncTime);

    switch (syncFrequency.toLowerCase()) {
      case 'daily':
        return `0 ${hour} * * *`; // Every day at specified hour
      case 'weekly':
        return `0 ${hour} * * 0`; // Every Sunday at specified hour
      case 'monthly':
        return `0 ${hour} 1 * *`; // First day of every month at specified hour
      default:
        this.logger.warn(`Unknown sync frequency: ${syncFrequency}, defaulting to weekly`);
        return `0 ${hour} * * 0`; // Default to weekly
    }
  }

  private parseTimeToHour(timeStr: string): number {
    const cleanTime = timeStr.toLowerCase().trim();

    // Handle formats like "9pm", "9 pm"
    if (cleanTime.includes('pm')) {
      const hourStr = cleanTime.replace(/pm/g, '').trim();
      const hour = parseInt(hourStr, 10);
      return hour === 12 ? 12 : hour + 12; // Convert PM to 24-hour format
    }

    // Handle formats like "9am", "9 am"
    if (cleanTime.includes('am')) {
      const hourStr = cleanTime.replace(/am/g, '').trim();
      const hour = parseInt(hourStr, 10);
      return hour === 12 ? 0 : hour; // Convert AM to 24-hour format
    }

    // Handle 24-hour format like "21:00", "21"
    if (cleanTime.includes(':')) {
      const [hourStr] = cleanTime.split(':');
      return parseInt(hourStr, 10);
    }

    // Handle simple hour format like "21"
    const hour = parseInt(cleanTime, 10);
    if (isNaN(hour) || hour < 0 || hour > 23) {
      this.logger.warn(`Invalid time format: ${timeStr}, defaulting to 21 (9 PM)`);
      return 21;
    }

    return hour;
  }
}
