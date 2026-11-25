import { Injectable } from '@nestjs/common';
import { MarketDataRepository } from '../market-data.repository';
import type { CaptureCall } from '../provider/capture';
import type { ProviderName } from '../provider/market-data-provider';
import { RawArchive } from './raw-archive';
import {
  diffRows,
  flatActions,
  flatBars,
  replay,
  type FlatRows,
  type RowDiff,
} from './replay';

/** One ticker's replayed rows against the database. */
export type TickerReplay = {
  ticker: string;
  /** False when the database has no such symbol: nothing to compare with. */
  stored: boolean;
  /** Null when the capture doesn't hold that half (see `replay`). */
  bars: RowDiff | null;
  actions: RowDiff | null;
};

export type ReplayReport = {
  captureId: string;
  provider: ProviderName;
  call: CaptureCall;
  exchanges: number;
  tickers: TickerReplay[];
};

/**
 * Replays an archived capture through its adapter and compares the rows
 * with the stored ones (the Phase 4 exit criterion: one archived payload
 * reproduces the stored bars exactly). It reads; it writes nothing.
 *
 * A difference is not always a fault. The database holds the latest answer
 * for a session and the archive holds every answer, so a bar the provider
 * corrected later differs from the capture that came before the correction.
 */
@Injectable()
export class ReplayService {
  constructor(
    private readonly archive: RawArchive,
    private readonly repository: MarketDataRepository,
  ) {}

  /** Null when the archive has no such capture. */
  async compare(captureId: string): Promise<ReplayReport | null> {
    const exchanges = await this.archive.exchanges(captureId);
    const [first] = exchanges;
    if (first === undefined) return null;
    const { call } = first;
    const replayed = await replay(exchanges);
    const ids = await this.repository.findSymbolIds(call.tickers);

    const tickers: TickerReplay[] = [];
    for (const ticker of call.tickers) {
      const id = ids.get(ticker);
      const against = async (
        rows: FlatRows | null,
        load: (symbolId: number) => Promise<FlatRows>,
      ) =>
        rows && diffRows(rows, id === undefined ? new Map() : await load(id));
      tickers.push({
        ticker,
        stored: id !== undefined,
        bars: await against(
          replayed.bars && flatBars(replayed.bars.get(ticker) ?? []),
          async (symbolId) =>
            flatBars(await this.repository.findCandles(symbolId, call.range)),
        ),
        actions: await against(
          replayed.actions && flatActions(replayed.actions.get(ticker) ?? []),
          async (symbolId) =>
            flatActions(
              await this.repository.findCorporateActions(symbolId, call.range),
            ),
        ),
      });
    }
    return {
      captureId,
      provider: first.provider,
      call,
      exchanges: exchanges.length,
      tickers,
    };
  }
}
