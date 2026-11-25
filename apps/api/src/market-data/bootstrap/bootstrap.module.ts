import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { IngestionService } from '../ingestion.service';
import { MarketCalendarService } from '../market-calendar.service';
import { MarketDataRepository } from '../market-data.repository';
import { ProviderModule } from '../provider/provider.module';
import { DataQualityRepository } from '../quality/data-quality.repository';
import { DataQualityService } from '../quality/data-quality.service';
import { SymbolUniverseService } from '../universe/universe.service';

/**
 * The container of the market-data CLIs (bootstrap, symbols:sync,
 * calendar:sync, jobs) and of the worker. Not imported by `AppModule`: it
 * has no HTTP surface. Each of them fails with a readable error when the
 * source it needs isn't configured (see ProviderModule).
 */
@Module({
  imports: [DatabaseModule, ProviderModule],
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
  ],
})
export class BootstrapModule {}
