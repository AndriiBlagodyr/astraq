import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MarketDataCacheModule } from './cache/market-data-cache.module';
import { IngestionService } from './ingestion.service';
import { MarketCalendarService } from './market-calendar.service';
import { MarketController } from './market.controller';
import { MarketDataRepository } from './market-data.repository';
import { OnDemandCandlesService } from './on-demand-candles.service';
import { ProviderModule } from './provider/provider.module';
import { DataQualityRepository } from './quality/data-quality.repository';
import { DataQualityService } from './quality/data-quality.service';

/**
 * The api server's slice of market data: on-demand candle loading for the
 * watchlists and orders, the exchange calendar with the market status
 * read from it (`GET /api/market/status`), and the latest data quality
 * check, which the worker runs and this only reads
 * (`GET /api/market/data-quality`). A provider is optional here
 * (see ProviderModule). Without one the server boots and serves stored
 * data: a newly watched symbol stays without candles until a backfill, and
 * the calendar is whatever `calendar:sync` last stored. With Alpaca keys
 * (the deployed api has them) the first watch loads the history and the
 * calendar reloads itself. Validated at boot, like every other variable.
 */
@Module({
  imports: [DatabaseModule, ProviderModule, MarketDataCacheModule],
  controllers: [MarketController],
  providers: [
    MarketDataRepository,
    IngestionService,
    OnDemandCandlesService,
    MarketCalendarService,
    DataQualityRepository,
    DataQualityService,
  ],
  exports: [OnDemandCandlesService, MarketCalendarService],
})
export class MarketDataModule {}
