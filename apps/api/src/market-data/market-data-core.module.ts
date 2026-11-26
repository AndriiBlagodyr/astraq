import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RawArchiveModule } from './archive/raw-archive.module';
import { MarketDataCacheModule } from './cache/market-data-cache.module';
import { IngestionService } from './ingestion.service';
import { MarketCalendarService } from './market-calendar.service';
import { MarketDataRepository } from './market-data.repository';
import { ProviderModule } from './provider/provider.module';
import { DataQualityRepository } from './quality/data-quality.repository';
import { DataQualityService } from './quality/data-quality.service';
import { SymbolUniverseService } from './universe/universe.service';

/**
 * Market data without an HTTP surface: the provider, the one write path
 * (`IngestionService`), the exchange calendar, and the data quality checks,
 * wired once for everything that runs them. The api server adds its
 * controller on top (`MarketDataModule`); the CLIs (bootstrap, symbols:sync,
 * calendar:sync, jobs) and the worker use it as it is or through
 * `JobsModule`.
 *
 * A source is optional (see ProviderModule): what can't work without one
 * says so with a readable error when it is called.
 */
@Module({
  imports: [
    DatabaseModule,
    ProviderModule,
    MarketDataCacheModule,
    RawArchiveModule,
  ],
  providers: [
    MarketDataRepository,
    IngestionService,
    SymbolUniverseService,
    MarketCalendarService,
    DataQualityRepository,
    DataQualityService,
  ],
  exports: [
    MarketDataRepository,
    IngestionService,
    MarketCalendarService,
    DataQualityService,
    ProviderModule,
    RawArchiveModule,
  ],
})
export class MarketDataCoreModule {}
