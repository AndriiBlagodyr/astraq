import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AlpacaClient } from '../alpaca/alpaca.client';
import { loadAlpacaEnv } from '../alpaca/alpaca.env';
import { MarketCalendarService } from '../market-calendar.service';
import { MarketDataRepository } from '../market-data.repository';
import { SymbolUniverseService } from '../universe/universe.service';
import { BootstrapService } from './bootstrap.service';

/**
 * The market-data CLIs' container (bootstrap, symbols:sync, calendar:sync). Not imported
 * by `AppModule`: here Alpaca keys are required, there they're optional
 * (see MarketDataModule).
 */
@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: AlpacaClient,
      useFactory: () => new AlpacaClient(loadAlpacaEnv()),
    },
    MarketDataRepository,
    BootstrapService,
    SymbolUniverseService,
    {
      provide: MarketCalendarService,
      inject: [MarketDataRepository, AlpacaClient],
      useFactory: (repository: MarketDataRepository, alpaca: AlpacaClient) =>
        new MarketCalendarService(repository, alpaca),
    },
  ],
})
export class BootstrapModule {}
