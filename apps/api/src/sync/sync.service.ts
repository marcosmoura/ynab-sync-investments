import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { AssetService } from '@/asset/asset.service';
import { MarketDataService } from '@/market-data/market-data.service';
import { SyncSchedule } from '@/shared/entities';
import { UserSettingsService } from '@/user-settings/user-settings.service';
import { YnabService } from '@/ynab/ynab.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly assetService: AssetService,
    private readonly userSettingsService: UserSettingsService,
    @Inject(forwardRef(() => YnabService))
    private readonly ynabService: YnabService,
    private readonly marketDataService: MarketDataService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleScheduledSync(): Promise<void> {
    try {
      const settings = await this.userSettingsService.findSettings();

      if (!settings) {
        this.logger.log('No user settings found, skipping sync');
        return;
      }

      if (this.shouldSync(settings.syncSchedule)) {
        await this.performSync(settings.ynabApiToken);
      }
    } catch (error) {
      this.logger.error('Error during scheduled sync', error);
    }
  }

  async performSync(ynabApiToken: string): Promise<void> {
    try {
      this.logger.log('Starting portfolio sync...');

      const assets = await this.assetService.findAll();

      if (assets.length === 0) {
        this.logger.log('No assets to sync');
        return;
      }

      // Group assets by YNAB account
      const assetsByAccount = new Map<string, typeof assets>();

      for (const asset of assets) {
        if (!assetsByAccount.has(asset.ynabAccountId)) {
          assetsByAccount.set(asset.ynabAccountId, []);
        }

        const accountAssetsList = assetsByAccount.get(asset.ynabAccountId);

        if (accountAssetsList) {
          accountAssetsList.push(asset);
        }
      }

      // Get YNAB accounts to determine currency
      const ynabAccounts = await this.ynabService.getAccounts(ynabApiToken);

      // Sync each account
      for (const [accountId, accountAssets] of assetsByAccount) {
        const ynabAccount = ynabAccounts.find((acc) => acc.id === accountId);

        if (!ynabAccount) {
          this.logger.warn(`YNAB account ${accountId} not found, skipping`);
          continue;
        }

        let totalValue = 0;

        // Calculate total value for all assets in this account
        for (const asset of accountAssets) {
          try {
            const assetPrice = await this.marketDataService.getAssetPrice(
              asset.symbol,
              ynabAccount.currency,
            );

            const assetValue = asset.amount * assetPrice.price;
            totalValue += assetValue;

            this.logger.log(
              `Asset ${asset.symbol}: ${asset.amount} x ${assetPrice.price} ${ynabAccount.currency} = ${assetValue}`,
            );
          } catch (error) {
            this.logger.error(`Failed to get price for ${asset.symbol}`, error);
          }
        }

        // Update YNAB account balance
        // TODO: Instead of updating balance, it should reconcile instead
        if (totalValue > 0) {
          await this.ynabService.updateAccountBalance(ynabApiToken, accountId, totalValue);

          this.logger.log(
            `Updated YNAB account ${ynabAccount.name} with total value: ${totalValue} ${ynabAccount.currency}`,
          );
        }
      }

      this.logger.log('Portfolio sync completed successfully');
    } catch (error) {
      this.logger.error('Error during portfolio sync', error);
      throw error;
    }
  }

  shouldSync(schedule: SyncSchedule): boolean {
    const now = new Date();
    const today = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayOfMonth = now.getDate();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // For simplicity, we'll check if it's time to sync based on current hour
    // In a production app, you'd want to store the last sync time and compare

    switch (schedule) {
      case SyncSchedule.DAILY:
        return true; // Sync every time this runs (hourly)

      case SyncSchedule.EVERY_TWO_DAYS:
        return dayOfMonth % 2 === 0;

      case SyncSchedule.WEEKLY:
        return today === 1; // Monday

      case SyncSchedule.EVERY_TWO_WEEKS: {
        // Sync every two weeks on Monday
        const weekNumber = Math.ceil(dayOfMonth / 7);
        return today === 1 && weekNumber % 2 === 0;
      }

      case SyncSchedule.MONTHLY_FIRST:
        return dayOfMonth === 1;

      case SyncSchedule.MONTHLY_LAST:
        return dayOfMonth === lastDayOfMonth;

      default:
        return false;
    }
  }

  async triggerManualSync(): Promise<void> {
    const settings = await this.userSettingsService.findSettings();

    if (!settings) {
      throw new Error('No user settings found. Please configure the application first.');
    }

    await this.performSync(settings.ynabApiToken);
  }
}
