import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MarketDataModule } from '@/market-data';
import { YnabModule } from '@/ynab';

import { FileSyncService } from './file-sync.service';

@Module({
  imports: [ConfigModule, MarketDataModule, YnabModule],
  providers: [FileSyncService],
  exports: [FileSyncService],
})
export class FileSyncModule {}
