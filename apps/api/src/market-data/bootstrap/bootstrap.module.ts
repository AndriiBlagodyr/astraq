import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AlpacaClient } from '../alpaca/alpaca.client';
import { loadAlpacaEnv } from '../alpaca/alpaca.env';
import { MarketDataRepository } from '../market-data.repository';
import { SymbolUniverseService } from '../universe/universe.service';
import { BootstrapService } from './bootstrap.service';

/**
 * The market-data CLIs' container (bootstrap and symbols:sync). Not imported
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
  ],
})
export class BootstrapModule {}
