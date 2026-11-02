import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CandlesRepository } from '../symbols/candles.repository';
import { SymbolsRepository } from '../symbols/symbols.repository';
import { WatchlistsController } from './watchlists.controller';
import { WatchlistsRepository } from './watchlists.repository';
import { WatchlistsService } from './watchlists.service';

@Module({
  imports: [DatabaseModule],
  controllers: [WatchlistsController],
  providers: [
    WatchlistsService,
    WatchlistsRepository,
    SymbolsRepository,
    CandlesRepository,
  ],
})
export class WatchlistsModule {}
