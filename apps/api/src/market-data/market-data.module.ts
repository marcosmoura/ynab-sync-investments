import { Module } from '@nestjs/common';

import { MarketDataService } from './market-data.service';
import { AlphaVantageService } from './providers/alpha-vantage/alpha-vantage.service';
import { CoinMarketCapService } from './providers/coinmarketcap/coinmarketcap.service';
import { FinnhubService } from './providers/finnhub/finnhub.service';
import { FMPService } from './providers/fmp/fmp.service';
import { PolygonService } from './providers/polygon/polygon.service';

@Module({
  providers: [
    MarketDataService,
    CoinMarketCapService,
    PolygonService,
    FinnhubService,
    AlphaVantageService,
    FMPService,
  ],
  exports: [MarketDataService],
})
export class MarketDataModule {}
