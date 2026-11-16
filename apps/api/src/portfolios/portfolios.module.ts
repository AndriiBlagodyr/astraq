import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { LedgerModule } from '../ledger/ledger.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { SymbolsRepository } from '../symbols/symbols.repository';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { PortfoliosController } from './portfolios.controller';
import { PortfoliosRepository } from './portfolios.repository';
import { PortfoliosService } from './portfolios.service';

/**
 * Paper trading (ROADMAP Phase 3 items 3 and 4): portfolios, their orders
 * and fills, and the splits and dividends that reach them. The rules are
 * pure code in `src/trading` and `src/ledger`; this module is their HTTP
 * and database edge.
 */
@Module({
  imports: [DatabaseModule, LedgerModule, MarketDataModule],
  controllers: [PortfoliosController, OrdersController],
  providers: [
    PortfoliosService,
    PortfoliosRepository,
    OrdersService,
    OrdersRepository,
    SymbolsRepository,
  ],
})
export class PortfoliosModule {}
