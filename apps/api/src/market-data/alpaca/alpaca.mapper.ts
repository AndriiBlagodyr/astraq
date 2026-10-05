import { Prisma } from '../../generated/prisma/client';
import type { CandleRow, CorporateActionRow } from '../market-data.repository';
import type { AlpacaBar, AlpacaCorporateActions } from './alpaca.schemas';

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
  const day = newYorkDate.format(new Date(barStart));
  return new Date(`${day}T00:00:00.000Z`);
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
