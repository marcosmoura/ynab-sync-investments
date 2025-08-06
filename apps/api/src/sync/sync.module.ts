import { Module, forwardRef } from '@nestjs/common';

import { AssetModule } from '@/asset';
import { MarketDataModule } from '@/market-data';
import { UserSettingsModule } from '@/user-settings';
import { YnabModule } from '@/ynab';

import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [AssetModule, UserSettingsModule, forwardRef(() => YnabModule), MarketDataModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
