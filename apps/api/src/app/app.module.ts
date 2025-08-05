import { INestApplication, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssetModule } from '@/asset';
import { DocumentationModule } from '@/documentation';
import { MarketDataModule } from '@/market-data';
import { Asset, UserSettings } from '@/shared/entities';
import * as migrations from '@/shared/migrations';
import { SyncModule } from '@/sync';
import { UserSettingsModule } from '@/user-settings';
import { YnabModule } from '@/ynab';

import { AppController } from './app.controller';
import { AppService } from './app.service';

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
        migrations: Object.values(migrations),
        migrationsTableName: 'migrations',
        migrationsRun: true, // Auto-run migrations on startup
        synchronize: false, // Never use synchronize in production
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    AssetModule,
    DocumentationModule,
    MarketDataModule,
    SyncModule,
    UserSettingsModule,
    YnabModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  public app: INestApplication;

  public setApp(app: INestApplication) {
    this.app = app;
  }
}
