import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketDataCoreModule } from './market-data-core.module';
import { OnDemandCandlesService } from './on-demand-candles.service';

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
  imports: [MarketDataCoreModule],
  controllers: [MarketController],
  providers: [OnDemandCandlesService],
  exports: [OnDemandCandlesService, MarketDataCoreModule],
})
export class MarketDataModule {}
