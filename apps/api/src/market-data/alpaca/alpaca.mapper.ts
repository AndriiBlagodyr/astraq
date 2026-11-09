import { utcMidnight } from '../../common/dates';
import { Prisma } from '../../generated/prisma/client';
import type {
  CandleRow,
  CorporateActionRow,
  SymbolSeed,
} from '../market-data.types';
import type {
  AlpacaAsset,
  AlpacaBar,
  AlpacaCorporateActions,
} from './alpaca.schemas';

/**
 * Alpaca's exchange labels to ISO 10383 MIC codes, the `symbols.exchange`
 * convention. OTC is left out on purpose: the free data plan serves no OTC
 * bars, and the ~20,000 pink-sheet tickers would swamp search with names
 * nobody can chart. `CRYPTO` never appears with `asset_class=us_equity`.
 */
const EXCHANGE_MIC: Record<string, string> = {
  NASDAQ: 'XNAS',
  NYSE: 'XNYS',
  ARCA: 'ARCX',
  AMEX: 'XASE',
  BATS: 'BATS',
};

/** Same shape as the api's `TickerParamSchema` and the 16-character column. */
const TICKER = /^[A-Z][A-Z0-9.-]{0,15}$/;

/**
 * The asset list to `symbols` rows: active, tradable US equities on a
 * listed exchange, with a ticker the api can route. A blank name (Alpaca
 * has a few) falls back to the ticker so search and tables never show an
 * empty cell. Sorted by ticker so the sync's log and counts are stable.
 */
export function toSymbolSeeds(assets: AlpacaAsset[]): SymbolSeed[] {
  const seeds: SymbolSeed[] = [];
  for (const asset of assets) {
    const exchange = EXCHANGE_MIC[asset.exchange];
    if (
      asset.status !== 'active' ||
      !asset.tradable ||
      asset.class !== 'us_equity' ||
      exchange === undefined ||
      !TICKER.test(asset.symbol)
    ) {
      continue;
    }
    const name = asset.name.trim();
    seeds.push({ ticker: asset.symbol, name: name || asset.symbol, exchange });
  }
  return seeds.sort((a, b) => (a.ticker < b.ticker ? -1 : 1));
}

// Alpaca stamps a daily bar with the start of its session day in New York
// (04:00 or 05:00 UTC, depending on DST). `en-CA` formats as YYYY-MM-DD.
const newYorkDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The bar's session date at 00:00 UTC, the `candles_daily.ts` convention. */
export function sessionDate(barStart: string): Date {
  return utcMidnight(newYorkDate.format(new Date(barStart)));
}

/** Raw bars to `candles_daily` rows. Prices stay decimal strings throughout. */
export function toCandleRows(bars: AlpacaBar[]): CandleRow[] {
  return bars.map((bar) => ({
    ts: sessionDate(bar.t),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  }));
}

/**
 * Splits and dividends to `corporate_actions` rows, grouped by ticker.
 * Alpaca's `old_rate -> new_rate` is our `split_from -> split_to` (NVDA 2024:
 * 1 -> 10, a reverse split runs the other way). Two dividends on one ex-date
 * (a regular plus a special) become one row with the summed amount, since
 * `(symbol, type, ex_date)` is unique and adjustment only needs the total.
 */
export function toCorporateActionRows(
  actions: AlpacaCorporateActions,
): Map<string, CorporateActionRow[]> {
  const byTicker = new Map<string, CorporateActionRow[]>();
  const add = (ticker: string, row: CorporateActionRow) => {
    const rows = byTicker.get(ticker) ?? [];
    rows.push(row);
    byTicker.set(ticker, rows);
  };

  for (const split of [...actions.forward_splits, ...actions.reverse_splits]) {
    add(split.symbol, {
      type: 'SPLIT',
      exDate: split.ex_date,
      splitFrom: split.old_rate,
      splitTo: split.new_rate,
    });
  }

  const dividends = new Map<string, Prisma.Decimal>();
  for (const dividend of actions.cash_dividends) {
    const key = `${dividend.symbol}|${dividend.ex_date}`;
    const total = dividends.get(key) ?? new Prisma.Decimal(0);
    dividends.set(key, total.plus(dividend.rate));
  }
  for (const [key, total] of dividends) {
    const [ticker, exDate] = key.split('|');
    add(ticker, { type: 'DIVIDEND', exDate, cashAmount: total.toFixed() });
  }

  return byTicker;
}
