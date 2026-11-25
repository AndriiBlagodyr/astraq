import { Inject, Injectable, Logger } from '@nestjs/common';
import { AlpacaClient } from '../alpaca/alpaca.client';
import { toSymbolSeeds } from '../alpaca/alpaca.mapper';
import { MarketDataCache } from '../cache/market-data-cache';
import {
  MarketDataRepository,
  type SymbolSyncSummary,
} from '../market-data.repository';
import { ALPACA } from '../provider/provider.module';

/**
 * Replaces the active symbol universe with Alpaca's current US equity list
 * (ROADMAP Phase 2, item 6), so search covers every listed ticker and not
 * only the bootstrapped twenty. Candles are not loaded here: a symbol gets
 * them when it's first watched (OnDemandCandlesService) or bootstrapped.
 */
@Injectable()
export class SymbolUniverseService {
  private readonly logger = new Logger(SymbolUniverseService.name);

  constructor(
    /** Null without Alpaca keys: no other provider has an asset list. */
    @Inject(ALPACA) private readonly alpaca: AlpacaClient | null,
    private readonly repository: MarketDataRepository,
    private readonly cache: MarketDataCache,
  ) {}

  async sync(): Promise<SymbolSyncSummary> {
    if (this.alpaca === null) {
      throw new Error(
        'The symbol list needs Alpaca keys (apps/api/.env.example)',
      );
    }
    const assets = await this.alpaca.activeUsEquities();
    const seeds = toSymbolSeeds(assets);
    this.logger.log(
      `Alpaca lists ${assets.length} active US equities, ` +
        `${seeds.length} on a listed exchange with a routable ticker`,
    );

    const summary = await this.repository.syncSymbols(seeds);
    // Listings, delistings, and renames all change what a search finds.
    await this.cache.forgetSearches();
    this.logger.log(
      `Symbols inserted: ${summary.inserted}, updated: ${summary.updated}, ` +
        `deactivated: ${summary.deactivated}`,
    );
    return summary;
  }
}
