import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AlpacaClient } from './alpaca/alpaca.client';
import { loadOptionalAlpacaEnv } from './alpaca/alpaca.env';
import { BootstrapService } from './bootstrap/bootstrap.service';
import { MarketCalendarService } from './market-calendar.service';
import { MarketDataRepository } from './market-data.repository';
import { OnDemandCandlesService } from './on-demand-candles.service';

const ALPACA = Symbol('optional Alpaca client');

/**
 * The api server's slice of market data: on-demand candle loading for the
 * watchlists and orders, and the exchange calendar. Alpaca keys are
 * optional here. Without them the server boots and serves stored data: a
 * newly watched symbol stays without candles until a bootstrap run, and the
 * calendar is whatever `calendar:sync` last stored. With them (the deployed
 * api has them) the first watch loads the history and the calendar reloads
 * itself. Validated at boot, like every other variable.
 */

@Module({
  imports: [DatabaseModule],
  providers: [
    MarketDataRepository,
    {
      provide: ALPACA,
      useFactory: (): AlpacaClient | null => {
        const alpaca = loadOptionalAlpacaEnv();
        return alpaca ? new AlpacaClient(alpaca) : null;
      },
    },
    {
      provide: OnDemandCandlesService,
      inject: [MarketDataRepository, ALPACA],
      useFactory: (
        repository: MarketDataRepository,
        alpaca: AlpacaClient | null,
      ) =>
        new OnDemandCandlesService(
          repository,
          alpaca ? new BootstrapService(alpaca, repository) : null,
        ),
    },
    {
      provide: MarketCalendarService,
      inject: [MarketDataRepository, ALPACA],
      useFactory: (
        repository: MarketDataRepository,
        alpaca: AlpacaClient | null,
      ) => new MarketCalendarService(repository, alpaca),
    },
  ],
  exports: [OnDemandCandlesService, MarketCalendarService],
})
export class MarketDataModule {}
