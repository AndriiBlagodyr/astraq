import { Inject, Injectable, Logger } from '@nestjs/common';
import { MarketDataCache } from './cache/market-data-cache';
import { MarketDataRepository } from './market-data.repository';
import type { DateRange, SymbolSeed } from './market-data.types';
import type { MarketDataProvider } from './provider/market-data-provider';
import { PROVIDER } from './provider/provider.module';

type Counts = { bars: number; splits: number; dividends: number };

/**
 * Loads raw daily bars and corporate actions from the configured provider
 * into the database: the one write path for both, shared by the bootstrap
 * CLI, the first watch of a symbol, and the jobs (ROADMAP Phase 4).
 *
 * Every method is idempotent: bars are upserted and each symbol's actions
 * in the range are replaced with what the provider reports now. Running one
 * again after a failure, or to pick up new days and corrections, changes
 * only what differs, which is what lets a job be retried without care.
 *
 * After a write it refreshes the weeks that range covers (the continuous
 * aggregate would otherwise hide them for up to an hour) and drops the
 * Redis closes for those symbols. A search can't be deleted by key, so a
 * write that changes what a search finds bumps the search generation.
 */
@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly repository: MarketDataRepository,
    private readonly cache: MarketDataCache,
    /** Null when no provider is configured (see ProviderModule). */
    @Inject(PROVIDER) private readonly provider: MarketDataProvider | null,
  ) {}

  /** Whether there is a provider to load from. */
  get available(): boolean {
    return this.provider !== null;
  }

  /** The provider, for a caller that plans work around its batch size. */
  get source(): MarketDataProvider {
    if (this.provider === null) {
      throw new Error(
        'No market data provider is configured: set the Alpaca keys or ' +
          'MARKET_DATA_PROVIDER=yahoo (apps/api/.env.example)',
      );
    }
    return this.provider;
  }

  /**
   * A symbol's whole history: creates or renames the symbols, then loads
   * their actions and bars over the range.
   */
  async backfill(symbols: SymbolSeed[], range: DateRange): Promise<void> {
    const provider = this.source;
    this.logger.log(
      `Loading ${symbols.length} symbols from ${provider.name}, ` +
        `${range.from} to ${range.to}`,
    );
    const ids = await this.repository.upsertSymbols(symbols);
    // Listings and renames change what a search finds.
    await this.cache.forgetSearches();
    const actions = await this.loadActions(provider, ids, range);
    const bars = await this.loadBars(provider, ids, range);

    for (const ticker of ids.keys()) {
      const rows = actions.get(ticker);
      this.logger.log(
        `${ticker.padEnd(6)} bars new or changed: ${bars.get(ticker) ?? 0}, ` +
          `splits: ${rows?.splits ?? 0}, dividends: ${rows?.dividends ?? 0}`,
      );
    }
  }

  /**
   * The bars of stored symbols over a range. Returns how many are new or
   * corrected, so a second run over the same range reports 0. A ticker the
   * database doesn't have is skipped.
   */
  async refreshBars(tickers: string[], range: DateRange): Promise<number> {
    const ids = await this.repository.findSymbolIds(tickers);
    const bars = await this.loadBars(this.source, ids, range);
    return [...bars.values()].reduce((sum, count) => sum + count, 0);
  }

  /**
   * The corporate actions of stored symbols over a range, replaced with
   * what the provider reports now. Returns how many it reports.
   */
  async refreshCorporateActions(
    tickers: string[],
    range: DateRange,
  ): Promise<number> {
    const ids = await this.repository.findSymbolIds(tickers);
    const actions = await this.loadActions(this.source, ids, range);
    return [...actions.values()].reduce(
      (sum, counts) => sum + counts.splits + counts.dividends,
      0,
    );
  }

  private async loadActions(
    provider: MarketDataProvider,
    ids: Map<string, number>,
    range: DateRange,
  ): Promise<Map<string, Omit<Counts, 'bars'>>> {
    const counts = new Map<string, Omit<Counts, 'bars'>>();
    if (ids.size === 0) return counts;
    const actions = await provider.corporateActions([...ids.keys()], range);
    for (const ticker of actions.keys()) requested(provider, ids, ticker);
    // Every requested ticker, not just those with actions: a symbol whose
    // only action was withdrawn upstream still needs the stale row removed.
    for (const [ticker, id] of ids) {
      const rows = actions.get(ticker) ?? [];
      await this.repository.replaceCorporateActions(id, range, rows);
      counts.set(ticker, {
        splits: rows.filter((row) => row.type === 'SPLIT').length,
        dividends: rows.filter((row) => row.type === 'DIVIDEND').length,
      });
    }
    await this.cache.forgetCloses([...ids.values()]);
    return counts;
  }

  private async loadBars(
    provider: MarketDataProvider,
    ids: Map<string, number>,
    range: DateRange,
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (ids.size === 0) return counts;
    for await (const page of provider.dailyBars([...ids.keys()], range)) {
      for (const [ticker, bars] of page) {
        const id = requested(provider, ids, ticker);
        const changed = await this.repository.upsertCandles(id, bars);
        counts.set(ticker, (counts.get(ticker) ?? 0) + changed);
      }
    }
    // Materialized weeks older than the last hourly refresh stay wrong until
    // we ask for them; a backfill would otherwise show empty weeks for an hour.
    await this.repository.refreshWeeklyBars(range);
    await this.cache.forgetCloses([...ids.values()]);
    // A symbol's first bars change the empty search (symbols that have any).
    await this.cache.forgetSearches();
    return counts;
  }
}

/**
 * The row id of a ticker the provider answered for. One it wasn't asked
 * about is caught before anything is written for it.
 */
function requested(
  provider: MarketDataProvider,
  ids: Map<string, number>,
  ticker: string,
): number {
  const id = ids.get(ticker);
  if (id === undefined) {
    throw new Error(`${provider.name} returned data for unrequested ${ticker}`);
  }
  return id;
}
