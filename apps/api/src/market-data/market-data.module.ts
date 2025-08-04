import { Module } from '@nestjs/common';
import { MarketDataService } from './services';
import { MarketDataController } from './controllers';

@Module({
  controllers: [MarketDataController],
  providers: [MarketDataService],
  exports: [MarketDataService],
})
export class MarketDataModule {}
