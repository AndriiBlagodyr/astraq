import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { IngestionService } from './ingestion.service';
import { MarketCalendarService } from './market-calendar.service';
import { MarketController } from './market.controller';
import { MarketDataRepository } from './market-data.repository';
import { OnDemandCandlesService } from './on-demand-candles.service';
import { ProviderModule } from './provider/provider.module';

/**
 * The api server's slice of market data: on-demand candle loading for the
 * watchlists and orders, and the exchange calendar with the market status
 * read from it (`GET /api/market/status`). A provider is optional here
 * (see ProviderModule). Without one the server boots and serves stored
 * data: a newly watched symbol stays without candles until a backfill, and
 * the calendar is whatever `calendar:sync` last stored. With Alpaca keys
 * (the deployed api has them) the first watch loads the history and the
 * calendar reloads itself. Validated at boot, like every other variable.
 */
@Module({
  imports: [DatabaseModule, ProviderModule],
  controllers: [MarketController],
  providers: [
    MarketDataRepository,
    IngestionService,
    OnDemandCandlesService,
    MarketCalendarService,
  ],
  exports: [OnDemandCandlesService, MarketCalendarService],
})
export class MarketDataModule {}
