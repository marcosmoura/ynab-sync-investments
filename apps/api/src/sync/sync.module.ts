import { Module, forwardRef } from '@nestjs/common';

import { AssetModule } from '../asset';
import { UserSettingsModule } from '../user-settings';
import { YnabModule } from '../ynab';
import { MarketDataModule } from '../market-data';

import { SyncService } from './sync.service';

@Module({
  imports: [AssetModule, UserSettingsModule, forwardRef(() => YnabModule), MarketDataModule],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
