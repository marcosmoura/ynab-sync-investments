import { Module } from '@nestjs/common';

import { MarketDataService } from './market-data.service';
import { AlphaVantageService } from './providers/alpha-vantage/alpha-vantage.service';
import { CoinMarketCapService } from './providers/coinmarketcap/coinmarketcap.service';
import { FinnhubService } from './providers/finnhub/finnhub.service';
import { PolygonService } from './providers/polygon/polygon.service';
import { RaiffeisenCZService } from './providers/raiffeisen-cz/raiffeisen-cz.service';
import { YahooFinanceService } from './providers/yahoo-finance/yahoo-finance.service';

@Module({
  providers: [
    MarketDataService,
    AlphaVantageService,
    CoinMarketCapService,
    FinnhubService,
    PolygonService,
    RaiffeisenCZService,
    YahooFinanceService,
  ],
  exports: [MarketDataService],
})
export class MarketDataModule {}
