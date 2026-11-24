import { Module } from '@nestjs/common';
import type { AlpacaClient } from '../alpaca/alpaca.client';
import type { MarketDataProvider } from './market-data-provider';
import { loadMarketDataSources, type MarketDataSources } from './provider.env';

const SOURCES = Symbol('market data sources');
/** Injects `AlpacaClient | null`: the asset list and the exchange calendar. */
export const ALPACA = Symbol('optional Alpaca client');
/** Injects `MarketDataProvider | null`: bars and corporate actions. */
export const PROVIDER = Symbol('optional market data provider');

/**
 * Where market data comes from, decided once from the environment
 * (`provider.env.ts`) for the api server, the CLIs, and the worker alike.
 * Both tokens can be null: the api server boots without any source and
 * serves what is stored. What can't work without one says so when called.
 */
@Module({
  providers: [
    { provide: SOURCES, useFactory: loadMarketDataSources },
    {
      provide: ALPACA,
      inject: [SOURCES],
      useFactory: (sources: MarketDataSources): AlpacaClient | null =>
        sources.alpaca,
    },
    {
      provide: PROVIDER,
      inject: [SOURCES],
      useFactory: (sources: MarketDataSources): MarketDataProvider | null =>
        sources.provider,
    },
  ],
  exports: [ALPACA, PROVIDER],
})
export class ProviderModule {}
