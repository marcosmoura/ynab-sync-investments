import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { AssetService } from '@/asset/asset.service';
import { AssetResponseDto } from '@/asset/dto';
import { SyncSchedule } from '@/database/entities';
import { MarketDataService } from '@/market-data/market-data.service';
import { UserSettingsResponseDto } from '@/user-settings/dto';
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
        await this.performSync(settings);
      }
    } catch (error) {
      this.logger.error('Error during scheduled sync', error);
    }
  }

  async performSync(userSettings: UserSettingsResponseDto): Promise<void> {
    try {
      this.logger.log('Starting portfolio sync...');

      const assets = await this.assetService.findAll();

      if (assets.length === 0) {
        this.logger.log('No assets to sync');
        return;
      }

      // Group assets by YNAB account
      const assetsByAccount = new Map<string, AssetResponseDto[]>();

      for (const asset of assets) {
        if (!assetsByAccount.has(asset.ynabAccountId)) {
          assetsByAccount.set(asset.ynabAccountId, []);
        }

        const accountAssetsList = assetsByAccount.get(asset.ynabAccountId);

        if (accountAssetsList) {
          accountAssetsList.push(asset);
        }
      }

      // Get YNAB accounts to determine currency (use target budget if specified)
      const ynabAccounts = await this.ynabService.getAccounts(
        userSettings.ynabApiToken,
        userSettings.targetBudgetId,
      );

      // Collect all unique symbols and their target currencies
      const symbolsByCurrency = new Map<string, Set<string>>();

      for (const [accountId, accountAssets] of assetsByAccount) {
        const ynabAccount = ynabAccounts.find((acc) => acc.id === accountId);

        if (!ynabAccount) {
          continue;
        }

        if (!symbolsByCurrency.has(ynabAccount.currency)) {
          symbolsByCurrency.set(ynabAccount.currency, new Set());
        }

        const currencySymbols = symbolsByCurrency.get(ynabAccount.currency);
        accountAssets.forEach((asset) => currencySymbols?.add(asset.symbol));
      }

      // Fetch all asset prices in bulk for each currency
      const pricesByCurrency = new Map<string, Map<string, { price: number; currency: string }>>();

      for (const [currency, symbols] of symbolsByCurrency) {
        try {
          const assetPrices = await this.marketDataService.getAssetPrices(
            Array.from(symbols),
            currency,
          );

          const pricesMap = new Map<string, { price: number; currency: string }>();
          assetPrices.forEach((assetPrice) => {
            pricesMap.set(assetPrice.symbol.toUpperCase(), {
              price: assetPrice.price,
              currency: assetPrice.currency,
            });
          });

          pricesByCurrency.set(currency, pricesMap);
        } catch (error) {
          this.logger.error(`Failed to fetch prices for currency ${currency}: ${error.message}`);
          pricesByCurrency.set(currency, new Map());
        }
      }

      // Sync each account
      for (const [accountId, accountAssets] of assetsByAccount) {
        const ynabAccount = ynabAccounts.find((acc) => acc.id === accountId);

        if (!ynabAccount) {
          this.logger.warn(`YNAB account ${accountId} not found, skipping`);
          continue;
        }

        let totalValue = 0;
        const pricesMap = pricesByCurrency.get(ynabAccount.currency);

        if (!pricesMap) {
          this.logger.warn(
            `No prices available for currency ${ynabAccount.currency}, skipping account`,
          );
          continue;
        }

        // Calculate total value for all assets in this account
        for (const asset of accountAssets) {
          const assetPrice = pricesMap.get(asset.symbol.toUpperCase());

          if (!assetPrice) {
            this.logger.warn(`Price not found for ${asset.symbol}, skipping asset`);
            continue;
          }

          // Check if we got a valid price
          if (!assetPrice.price || assetPrice.price <= 0) {
            this.logger.warn(
              `Invalid price received for ${asset.symbol}: ${assetPrice.price}, skipping asset`,
            );
            continue;
          }

          const price = assetPrice.price;
          const currency = assetPrice.currency ?? ynabAccount.currency;
          const assetValue = asset.amount * price;
          totalValue += assetValue;

          this.logger.log(
            `Asset ${asset.symbol}: ${asset.amount} x ${price} ${currency} = ${assetValue.toFixed(2)}`,
          );
        }

        // Reconcile YNAB account balance with calculated portfolio value
        if (totalValue > 0) {
          const assetSymbols = accountAssets.map((asset) => asset.symbol);
          await this.ynabService.reconcileAccountBalance(
            userSettings.ynabApiToken,
            accountId,
            totalValue,
            userSettings.targetBudgetId,
            assetSymbols,
          );

          this.logger.log(
            `Reconciled YNAB account ${ynabAccount.name} with portfolio value: ${totalValue} ${ynabAccount.currency}`,
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

    await this.performSync(settings);
  }
}
