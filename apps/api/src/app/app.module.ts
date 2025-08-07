import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { FileSyncModule } from '@/file-sync';
import { MarketDataModule } from '@/market-data';
import { YnabModule } from '@/ynab';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../../.env'],
      cache: false,
    }),
    ScheduleModule.forRoot(),
    FileSyncModule,
    MarketDataModule,
    YnabModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
