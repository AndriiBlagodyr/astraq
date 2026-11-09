import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AlpacaClient } from './alpaca/alpaca.client';
import { loadOptionalAlpacaEnv } from './alpaca/alpaca.env';
import { BootstrapService } from './bootstrap/bootstrap.service';
import { MarketDataRepository } from './market-data.repository';
import { OnDemandCandlesService } from './on-demand-candles.service';

/**
 * The api server's slice of market data: on-demand candle loading for the
 * watchlists. Alpaca keys are optional here. Without them the server boots
 * and serves stored data, and a newly watched symbol stays without candles
 * until a bootstrap run; with them (the deployed api has them) the first
 * watch loads the history. Validated at boot, like every other variable.
 */
@Module({
  imports: [DatabaseModule],
  providers: [
    MarketDataRepository,
    {
      provide: OnDemandCandlesService,
      inject: [MarketDataRepository],
      useFactory: (repository: MarketDataRepository) => {
        const alpaca = loadOptionalAlpacaEnv();
        const bootstrap = alpaca
          ? new BootstrapService(new AlpacaClient(alpaca), repository)
          : null;
        return new OnDemandCandlesService(repository, bootstrap);
      },
    },
  ],
  exports: [OnDemandCandlesService],
})
export class MarketDataModule {}
