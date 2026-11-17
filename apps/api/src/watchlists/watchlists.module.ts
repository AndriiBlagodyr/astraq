import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { SymbolsModule } from '../symbols/symbols.module';
import { WatchlistsController } from './watchlists.controller';
import { WatchlistsRepository } from './watchlists.repository';
import { WatchlistsService } from './watchlists.service';

@Module({
  imports: [DatabaseModule, MarketDataModule, SymbolsModule],
  controllers: [WatchlistsController],
  providers: [WatchlistsService, WatchlistsRepository],
})
export class WatchlistsModule {}
