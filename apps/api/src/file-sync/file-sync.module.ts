import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssetModule } from '@/asset/asset.module';
import { Asset } from '@/database/entities';
import { SyncModule } from '@/sync/sync.module';
import { UserSettingsModule } from '@/user-settings/user-settings.module';

import { FileSyncController } from './file-sync.controller';
import { FileSyncService } from './file-sync.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Asset]),
    AssetModule,
    UserSettingsModule,
    SyncModule,
  ],
  controllers: [FileSyncController],
  providers: [FileSyncService],
  exports: [FileSyncService],
})
export class FileSyncModule {}
