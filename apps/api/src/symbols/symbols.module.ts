import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MarketDataCacheModule } from '../market-data/cache/market-data-cache.module';
import { CandlesRepository } from './candles.repository';
import { SymbolsController } from './symbols.controller';
import { SymbolsRepository } from './symbols.repository';
import { SymbolsService } from './symbols.service';

@Module({
  imports: [DatabaseModule, MarketDataCacheModule],
  controllers: [SymbolsController],
  providers: [SymbolsService, SymbolsRepository, CandlesRepository],
  // Watchlists and portfolios read symbols and closes through these. The
  // service is exported for its cached `latestCloses`.
  exports: [SymbolsService, SymbolsRepository, CandlesRepository],
})
export class SymbolsModule {}
