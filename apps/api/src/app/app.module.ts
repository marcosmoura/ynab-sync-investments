import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { Asset, UserSettings } from '@/shared/entities';
import { AssetModule } from '@/asset';
import { MarketDataModule } from '@/market-data';
import { SyncModule } from '@/sync';
import { UserSettingsModule } from '@/user-settings';
import { YnabModule } from '@/ynab';

import { AppController } from './controllers';
import { AppService } from './services';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../../.env'],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: parseInt(configService.get('DB_PORT', '5432')),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_NAME', 'ynab_investments'),
        entities: [Asset, UserSettings],
        synchronize: configService.get('NODE_ENV') !== 'production', // Only in development
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    AssetModule,
    MarketDataModule,
    SyncModule,
    UserSettingsModule,
    YnabModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
