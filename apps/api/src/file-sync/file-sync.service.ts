import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import * as yaml from 'js-yaml';

import { MarketDataService } from '@/market-data/market-data.service';
import { convertCurrency } from '@/market-data/utils';
import { YnabService } from '@/ynab/ynab.service';

type CashData = {
  amount?: number;
  currency?: string;
};

interface YamlConfig {
  budget: string;
  schedule?: {
    sync_time?: string; // Time to sync (e.g., "8pm", "21:00")
    sync_frequency?: 'daily' | 'weekly' | 'monthly'; // How often to sync
    timezone?: string;
  };
  accounts: Array<{
    account_id: string;
    holdings: Record<string, number>;
    cash?: CashData;
  }>;
}

interface CachedConfig {
  config: YamlConfig;
  fetchedAt: Date;
  lastSyncAt?: Date;
  hash: string;
}

@Injectable()
export class FileSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FileSyncService.name);
  private cachedConfig: CachedConfig | null = null;

  // Cron job identifiers
  private static readonly DAILY_FETCH_JOB = 'daily-config-fetch';
  private static readonly FALLBACK_SYNC_JOB = 'fallback-ynab-sync';
  private static readonly CUSTOM_SYNC_JOB = 'custom-ynab-sync';

  constructor(
    private readonly configService: ConfigService,
    private readonly ynabService: YnabService,
    private readonly marketDataService: MarketDataService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    // Fetch initial config on startup
    const cached = await this.fetchAndCacheConfig();

    if (!cached) {
      this.logger.warn('No valid config found during initialization');
      // Still set up fallback schedule even if no config is available initially
      this.setupYnabSyncSchedule(null);
      return;
    }

    this.logger.log('Module initialized successfully with config');
  }

  onModuleDestroy() {
    // Clean up any dynamic cron jobs when the module is destroyed
    try {
      this.schedulerRegistry.deleteCronJob('custom-ynab-sync');
    } catch {
      // Job doesn't exist, which is fine
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8PM, {
    name: FileSyncService.DAILY_FETCH_JOB,
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

  @Cron(CronExpression.EVERY_DAY_AT_8PM, {
    name: FileSyncService.FALLBACK_SYNC_JOB,
    timeZone: 'UTC',
  })
  async handleWeeklyYnabSync(): Promise<void> {
    try {
      // Only run if no custom schedule is configured
      if (!this.hasCustomSchedule(this.cachedConfig?.config ?? null)) {
        this.logger.log('Fallback YNAB sync triggered (no custom schedule configured)');
        await this.handleScheduledYnabSync();
      } else {
        this.logger.debug('Skipping fallback sync - custom schedule is active');
      }
    } catch (error) {
      this.logger.error('Error during fallback YNAB sync', error);
    }
  }

  async fetchAndCacheConfig(): Promise<CachedConfig | null> {
    try {
      const configFileUrl = this.configService.get<string>('INVESTMENTS_CONFIG_FILE_URL');

      if (!configFileUrl) {
        this.logger.warn('INVESTMENTS_CONFIG_FILE_URL not configured, skipping config fetch');
        return null;
      }

      this.logger.log('Fetching config from URL:');
      this.logger.log(configFileUrl);

      const fileContent = await this.fetchConfigFile(configFileUrl);
      if (!fileContent) {
        return null;
      }

      const config = this.parseConfigFile(fileContent);
      if (!config) {
        return null;
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

      // Update schedule if config changed or is first fetch
      if (isFirstFetch || hasChanged) {
        this.logger.log('Updating YNAB sync schedule due to config change');
        this.setupYnabSyncSchedule(config);

        // Only trigger sync on startup in production
        const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

        if (nodeEnv === 'production') {
          this.logger.log('Triggering YNAB sync due to config change or first fetch');
          await this.performYnabSync();
        } else {
          this.logger.log('Development mode: Skipping automatic config fetch on startup');
        }
      }

      return this.cachedConfig;
    } catch (error) {
      this.logger.error('Error fetching and caching config', error);
      throw error;
    }
  }

  private async fetchConfigFile(configFileUrl: string): Promise<string | null> {
    try {
      const cacheBustUrl = this.buildCacheBustUrl(configFileUrl);

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

  private buildCacheBustUrl(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_t=${Date.now()}`;
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

  private setupYnabSyncSchedule(config: YamlConfig | null): void {
    try {
      // Remove any existing dynamic cron job
      this.safeDeleteCronJob(FileSyncService.CUSTOM_SYNC_JOB);

      // If no config is provided, just cleanup and rely on fallback schedule
      if (!config) {
        this.logger.log(
          'No config available, using fallback weekly YNAB sync schedule (Sunday 8 PM UTC)',
        );
        return;
      }

      // Log the YNAB sync configuration
      const timezone = config.schedule?.timezone || 'UTC';
      let customCron: string | null = null;

      if (this.hasCustomSchedule(config)) {
        const schedule = config.schedule;
        const syncTime = schedule?.sync_time;
        const syncFrequency = schedule?.sync_frequency;

        if (syncTime && syncFrequency) {
          customCron = this.convertScheduleToCron(syncTime, syncFrequency);
        }
      }

      if (customCron) {
        if (this.isValidSyncCron(customCron)) {
          // Create a new dynamic cron job with the specified timezone
          const job = new CronJob(
            customCron,
            async () => {
              try {
                this.logger.log('Custom scheduled YNAB sync triggered');
                await this.handleScheduledYnabSync();
              } catch (error) {
                this.logger.error('Error in custom scheduled YNAB sync', error);
              }
            },
            null,
            false,
            timezone,
          );

          this.schedulerRegistry.addCronJob(FileSyncService.CUSTOM_SYNC_JOB, job);
          job.start();

          this.logger.log(`Custom YNAB sync schedule configured successfully:`);

          if (config.schedule?.sync_time && config.schedule?.sync_frequency) {
            this.logger.log(
              `${config.schedule.sync_frequency} at ${config.schedule.sync_time} (cron: ${customCron}, timezone: ${timezone})`,
            );
          } else {
            this.logger.log(`${customCron} (timezone: ${timezone})`);
          }

          this.logger.log(
            'Custom scheduling is now active and will respect the configured timezone',
          );
        } else {
          this.logger.warn(
            'Custom sync schedule allows too frequent execution, using default weekly schedule',
          );
        }
      } else {
        this.logger.log(
          'No custom schedule configured, using default weekly YNAB sync schedule (Sunday 8 PM UTC)',
        );
      }
    } catch (error) {
      this.logger.error('Error setting up YNAB sync schedule', error);
    }
  }

  private safeDeleteCronJob(name: string) {
    try {
      this.schedulerRegistry.deleteCronJob(name);
      this.logger.debug(`Removed existing ${name} job`);
    } catch {
      // Job doesn't exist; ignore
    }
  }

  private isValidSyncCron(cronExpression: string): boolean {
    try {
      this.logger.debug(`Validating cron expression: ${cronExpression}`);

      // Basic validation for cron expression format
      const parts = cronExpression.split(' ');

      // A cron expression should have 5 or 6 parts
      if (parts.length < 5 || parts.length > 6) {
        this.logger.warn(
          `Invalid cron expression format: ${cronExpression} (expected 5 or 6 parts, got ${parts.length})`,
        );
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

      this.logger.debug(`Cron expression ${cronExpression} is valid`);
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

      this.logger.log('Scheduled YNAB sync triggered');
      await this.performYnabSync();
    } catch (error) {
      this.logger.error('Error during scheduled YNAB sync', error);
    }
  }

  private convertCashToCurrency(
    { amount, currency }: CashData = {},
    toCurrency: string,
  ): Promise<number> {
    if (!amount || !currency) {
      this.logger.warn('No cash data available for conversion');
      return Promise.resolve(0);
    }

    this.logger.log(`Adding ${amount} ${currency} in cash`);

    if (currency === toCurrency) {
      this.logger.log(`Cash is already in target currency (${toCurrency}), no conversion needed`);

      return Promise.resolve(amount);
    }

    this.logger.log(`Converting cash from ${currency} to ${toCurrency}`);

    return convertCurrency(amount, currency, toCurrency);
  }

  private async performYnabSync(): Promise<void> {
    try {
      if (!this.cachedConfig) {
        throw new Error('No cached config available for YNAB sync');
      }

      const { config } = this.cachedConfig;
      const ynabToken = this.getYnabTokenOrThrow();

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
          const currency = await this.ynabService.getBudgetCurrency(ynabToken, config.budget);
          const cash = await this.convertCashToCurrency(account.cash, currency);
          const assetPrices = await this.marketDataService.getAssetPrices(symbols, currency, true);

          // Calculate total portfolio value for this account
          let totalValue = cash;

          for (const symbol of symbols) {
            const quantity = holdings[symbol];
            const assetPrice = assetPrices.find((price) => price.symbol === symbol);

            if (assetPrice) {
              const assetValue = quantity * assetPrice.price;
              totalValue += assetValue;
              this.logger.log(
                `  ${symbol}: ${quantity} * ${assetPrice.price} = ${assetValue.toFixed(2)}`,
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

  private getYnabTokenOrThrow(): string {
    const ynabToken = this.configService.get<string>('YNAB_API_KEY');

    if (!ynabToken) {
      throw new Error('YNAB_API_KEY not configured');
    }

    return ynabToken;
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
    // Parse time (supports formats like "8pm", "21:00", "9:00 PM", etc.)
    const hour = this.parseTimeToHour(syncTime);
    this.logger.debug(`Converting schedule: ${syncFrequency} at ${syncTime} -> hour: ${hour}`);

    switch (syncFrequency.toLowerCase()) {
      case 'daily': {
        const dailyCron = `0 ${hour} * * *`; // Every day at specified hour
        this.logger.debug(`Daily schedule converted to: ${dailyCron}`);
        return dailyCron;
      }
      case 'weekly': {
        const weeklyCron = `0 ${hour} * * 0`; // Every Sunday at specified hour
        this.logger.debug(`Weekly schedule converted to: ${weeklyCron}`);
        return weeklyCron;
      }
      case 'monthly': {
        const monthlyCron = `0 ${hour} 1 * *`; // First day of every month at specified hour
        this.logger.debug(`Monthly schedule converted to: ${monthlyCron}`);
        return monthlyCron;
      }
      default: {
        this.logger.warn(`Unknown sync frequency: ${syncFrequency}, defaulting to weekly`);
        const defaultCron = `0 ${hour} * * 0`; // Default to weekly
        this.logger.debug(`Default schedule: ${defaultCron}`);
        return defaultCron;
      }
    }
  }

  private parseTimeToHour(timeStr: string): number {
    const cleanTime = timeStr.toLowerCase().trim();
    this.logger.debug(`Parsing time: "${timeStr}" -> cleaned: "${cleanTime}"`);

    // 12-hour format like "8pm", "8 pm", "9 am"
    const twelveHourMatch = cleanTime.match(/^\s*(\d{1,2})\s*(:\d{2})?\s*(am|pm)\s*$/i);

    if (twelveHourMatch) {
      const hourRaw = parseInt(twelveHourMatch[1] ?? '0', 10);
      const meridiem = (twelveHourMatch[3] ?? 'am').toLowerCase() as 'am' | 'pm';
      const result = meridiem === 'pm' ? (hourRaw % 12) + 12 : hourRaw % 12;

      this.logger.debug(`12-hour format: ${hourRaw}${meridiem} -> ${result}`);

      return result;
    }

    // 24-hour format: "21:00", "21"
    const twentyFourHourWithColon = cleanTime.match(/^\s*(\d{1,2}):\d{2}\s*$/);

    if (twentyFourHourWithColon) {
      const result = parseInt(twentyFourHourWithColon[1] ?? '0', 10);

      this.logger.debug(`24-hour with colon -> ${result}`);

      return result;
    }

    const onlyHour = cleanTime.match(/^\s*(\d{1,2})\s*$/);

    if (onlyHour) {
      const result = parseInt(onlyHour[1] ?? '0', 10);

      this.logger.debug(`Hour only -> ${result}`);

      if (!Number.isNaN(result) && result >= 0 && result <= 23) {
        return result;
      }
    }

    this.logger.warn(`Invalid time format: ${timeStr}, defaulting to 21 (8 PM)`);

    return 21;
  }

  private hasCustomSchedule(config: YamlConfig | null): boolean {
    return !!config?.schedule?.sync_time && !!config?.schedule?.sync_frequency;
  }
}
