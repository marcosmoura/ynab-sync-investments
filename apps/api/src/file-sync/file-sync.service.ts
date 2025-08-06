import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import * as yaml from 'js-yaml';
import { Repository } from 'typeorm';

import { Asset } from '@/database/entities';
import { SyncService } from '@/sync/sync.service';
import { UserSettingsService } from '@/user-settings/user-settings.service';

interface YamlConfig {
  budget: string;
  accounts: Array<{
    account_id: string;
    holdings: Record<string, number>;
  }>;
}

@Injectable()
export class FileSyncService {
  private readonly logger = new Logger(FileSyncService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userSettingsService: UserSettingsService,
    private readonly syncService: SyncService,
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleScheduledFileSync(): Promise<void> {
    try {
      const settings = await this.userSettingsService.findSettings();

      // Default to daily sync if no settings found
      const shouldRunSync = !settings || this.syncService.shouldSync(settings.syncSchedule);

      if (shouldRunSync) {
        await this.processConfigFile();
      } else {
        this.logger.log('File sync skipped based on schedule settings');
      }
    } catch (error) {
      this.logger.error('Error during scheduled file sync', error);
    }
  }

  async processConfigFile(): Promise<void> {
    try {
      const configFileUrl = this.configService.get<string>('INVESTMENTS_CONFIG_FILE_URL');

      if (!configFileUrl) {
        this.logger.warn('INVESTMENTS_CONFIG_FILE_URL not configured, skipping file sync');
        return;
      }

      this.logger.log(`Fetching config from URL: ${configFileUrl}`);

      // Fetch the remote YAML file
      let fileContent: string;
      try {
        const response = await fetch(configFileUrl);

        if (!response.ok) {
          this.logger.warn(
            `Failed to fetch config file: ${response.status} ${response.statusText}`,
          );
          return;
        }

        fileContent = await response.text();
      } catch (error) {
        this.logger.warn(`Config file could not be fetched: ${error.message}`);
        return;
      }

      // Parse YAML content
      const config = yaml.load(fileContent) as YamlConfig;

      if (!config || !config.accounts || !Array.isArray(config.accounts)) {
        this.logger.error('Invalid config file format');
        return;
      }

      this.logger.log(`Found ${config.accounts.length} accounts in config file`);

      // Process each account
      for (const accountConfig of config.accounts) {
        await this.processAccount(accountConfig);
      }

      this.logger.log('File processing completed, triggering YNAB sync...');

      // Trigger sync to YNAB after processing all accounts
      await this.syncService.triggerManualSync();

      this.logger.log('File sync and YNAB sync completed successfully');
    } catch (error) {
      this.logger.error('Error processing config file', error);
      throw error;
    }
  }

  private async processAccount(accountConfig: {
    account_id: string;
    holdings: Record<string, number>;
  }): Promise<void> {
    const { account_id, holdings } = accountConfig;

    this.logger.log(`Processing account: ${account_id}`);

    // Remove all existing assets for this account
    await this.assetRepository.delete({ ynabAccountId: account_id });
    this.logger.log(`Removed existing assets for account: ${account_id}`);

    // Create new assets from file data
    const assets = Object.entries(holdings).map(([symbol, amount]) => ({
      symbol: symbol.toUpperCase(),
      amount,
      ynabAccountId: account_id,
    }));

    if (assets.length > 0) {
      await this.assetRepository.save(assets);
      this.logger.log(`Created ${assets.length} assets for account: ${account_id}`);

      // Log the assets for visibility
      assets.forEach((asset) => {
        this.logger.log(`  ${asset.symbol}: ${asset.amount}`);
      });
    } else {
      this.logger.log(`No holdings found for account: ${account_id}`);
    }
  }

  async triggerManualFileSync(): Promise<void> {
    this.logger.log('Manual file sync triggered');
    await this.processConfigFile();
  }
}
