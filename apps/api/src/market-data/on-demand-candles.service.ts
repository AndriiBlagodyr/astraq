import { Injectable, Logger } from '@nestjs/common';
import { yesterdayUtc } from '../common/dates';
import { BOOTSTRAP_FROM } from './bootstrap/bootstrap-symbols';
import { BootstrapService } from './bootstrap/bootstrap.service';
import { MarketDataRepository } from './market-data.repository';

/**
 * Loads a symbol's history the first time it's watched, through the same
 * bootstrap path as the CLI, so the whole universe is searchable without
 * storing candles for 11,000 tickers up front (ROADMAP Phase 2, item 6).
 *
 * Runs inline in the request: one corporate-actions request and one bars
 * request, a second or two, after which the new watchlist row already has
 * its close and sparkline. A queue (Phase 4) would only turn that wait into
 * a loading state. Failures are logged, never thrown: the symbol is on the
 * list either way, and the next add retries.
 */
@Injectable()
export class OnDemandCandlesService {
  private readonly logger = new Logger(OnDemandCandlesService.name);
  /** One load per symbol at a time; concurrent adds await the same one. */
  private readonly inFlight = new Map<number, Promise<void>>();

  constructor(
    private readonly repository: MarketDataRepository,
    /** Null when the api runs without Alpaca keys (see MarketDataModule). */
    private readonly bootstrap: BootstrapService | null,
  ) {}

  /** Resolves once the symbol has candles, or once loading them has failed. */
  async ensureCandles(symbolId: number): Promise<void> {
    if (this.bootstrap === null) return;
    if (await this.repository.hasCandles(symbolId)) return;

    const pending = this.inFlight.get(symbolId);
    if (pending !== undefined) return pending;

    const load = this.load(symbolId, this.bootstrap).finally(() => {
      this.inFlight.delete(symbolId);
    });
    this.inFlight.set(symbolId, load);
    return load;
  }

  private async load(symbolId: number, bootstrap: BootstrapService) {
    try {
      const seed = await this.repository.findSeed(symbolId);
      if (seed === null) return;
      await bootstrap.run([seed], { from: BOOTSTRAP_FROM, to: yesterdayUtc() });
    } catch (error) {
      this.logger.warn(
        `Loading candles for symbol ${symbolId} failed: ` +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }
}
