import { Injectable, Logger } from '@nestjs/common';
import { AlpacaClient } from '../alpaca/alpaca.client';
import { toSymbolSeeds } from '../alpaca/alpaca.mapper';
import {
  MarketDataRepository,
  type SymbolSyncSummary,
} from '../market-data.repository';

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
    private readonly alpaca: AlpacaClient,
    private readonly repository: MarketDataRepository,
  ) {}

  async sync(): Promise<SymbolSyncSummary> {
    const assets = await this.alpaca.activeUsEquities();
    const seeds = toSymbolSeeds(assets);
    this.logger.log(
      `Alpaca lists ${assets.length} active US equities, ` +
        `${seeds.length} on a listed exchange with a routable ticker`,
    );

    const summary = await this.repository.syncSymbols(seeds);
    this.logger.log(
      `Symbols inserted: ${summary.inserted}, updated: ${summary.updated}, ` +
        `deactivated: ${summary.deactivated}`,
    );
    return summary;
  }
}
