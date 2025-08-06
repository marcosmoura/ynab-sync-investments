import { Module } from '@nestjs/common';

import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { AlphaVantageService } from './providers/alpha-vantage/alpha-vantage.service';
import { CoinMarketCapService } from './providers/coinmarketcap/coinmarketcap.service';
import { FinnhubService } from './providers/finnhub/finnhub.service';
import { PolygonService } from './providers/polygon/polygon.service';

@Module({
  controllers: [MarketDataController],
  providers: [
    MarketDataService,
    CoinMarketCapService,
    PolygonService,
    FinnhubService,
    AlphaVantageService,
  ],
  exports: [MarketDataService],
})
export class MarketDataModule {}
