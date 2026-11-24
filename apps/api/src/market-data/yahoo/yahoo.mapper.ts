import { utcMidnight } from '../../common/dates';
import { Prisma } from '../../generated/prisma/client';
import { sessionDate } from '../../trading/market-hours';
import type {
  CandleRow,
  CorporateActionRow,
  DateRange,
} from '../market-data.types';
import type { YahooChartResult, YahooSplit } from './yahoo.schemas';

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

/** A split as the mapper works with it: its ex-date and shares after per share before. */
export type SplitFactor = { exDate: string; from: Decimal; to: Decimal };

/** The New York session date of a Yahoo timestamp (a session's open). */
const dateOf = (unixSeconds: string) =>
  sessionDate(new Date(Number(unixSeconds) * 1000));

export function toSplitFactors(splits: YahooSplit[]): SplitFactor[] {
  return splits.map((split) => ({
    exDate: dateOf(split.date),
    from: new Decimal(split.denominator),
    to: new Decimal(split.numerator),
  }));
}

/**
 * Yahoo prints a price as the 32-bit float it stores (124.80750274658203
 * for 124.8075), and undoing a split multiplies that noise. A US stock
 * quotes in cents, or in hundredths of a cent under a dollar, so the raw
 * price is the nearest of those. A trade printed at a finer price (some
 * are, between the quotes) comes out rounded to the cent: Yahoo never had
 * the rest.
 */
function price(value: Decimal): string {
  return value
    .toDecimalPlaces(value.lessThan(1) ? 4 : 2, Decimal.ROUND_HALF_UP)
    .toFixed();
}

/**
 * One chart response to raw bars and corporate actions inside `range`.
 *
 * Yahoo divides every price by, and multiplies every volume by, the ratio
 * of each split that came after the bar, up to today. `splits` is every
 * split from the range's first day to today (the ones after the range come
 * from a second request), so each bar and dividend can be brought back to
 * what was traded and paid on its day: times the ratios of the splits with
 * a later ex-date. A bar on an ex-date is already in the new shares.
 *
 * A session Yahoo has no numbers for (a null in any column) is left out;
 * a session listed twice keeps its last entry.
 */
export function toYahooSeries(
  result: YahooChartResult,
  splits: SplitFactor[],
  range: DateRange,
): { candles: CandleRow[]; actions: CorporateActionRow[] } {
  const inRange = (date: string) => date >= range.from && date <= range.to;
  const factorAfter = (date: string) =>
    splits
      .filter((split) => split.exDate > date)
      .reduce((factor, split) => factor.times(split.to).div(split.from), new Decimal(1));

  const quote = result.indicators.quote[0];
  const bars = new Map<string, CandleRow>();
  result.timestamp.forEach((timestamp, index) => {
    const date = dateOf(timestamp);
    const [open, high, low, close, volume] = [
      quote.open[index],
      quote.high[index],
      quote.low[index],
      quote.close[index],
      quote.volume[index],
    ];
    if (
      !inRange(date) ||
      open == null ||
      high == null ||
      low == null ||
      close == null ||
      volume == null
    ) {
      return;
    }
    const factor = factorAfter(date);
    bars.set(date, {
      ts: utcMidnight(date),
      open: price(factor.times(open)),
      high: price(factor.times(high)),
      low: price(factor.times(low)),
      close: price(factor.times(close)),
      volume: new Decimal(volume)
        .div(factor)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
        .toFixed(),
    });
  });

  const actions: CorporateActionRow[] = splits
    .filter((split) => inRange(split.exDate))
    .map((split) => ({
      type: 'SPLIT',
      exDate: split.exDate,
      splitFrom: split.from.toFixed(),
      splitTo: split.to.toFixed(),
    }));

  // Two dividends on one ex-date (a regular and a special) are one row with
  // the summed amount, as in the Alpaca mapper: the key is unique.
  const dividends = new Map<string, Decimal>();
  for (const dividend of Object.values(result.events.dividends)) {
    const exDate = dateOf(dividend.date);
    if (!inRange(exDate)) continue;
    const paid = factorAfter(exDate).times(dividend.amount);
    dividends.set(exDate, (dividends.get(exDate) ?? new Decimal(0)).plus(paid));
  }
  for (const [exDate, total] of dividends) {
    actions.push({
      type: 'DIVIDEND',
      exDate,
      // The same float noise as a price, on amounts quoted to fractions of
      // a cent: six places keep every real one.
      cashAmount: total.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toFixed(),
      // Yahoo doesn't say when a dividend is paid.
      payDate: null,
    });
  }

  return {
    candles: [...bars.values()].sort((a, b) => a.ts.getTime() - b.ts.getTime()),
    actions: actions.sort((a, b) => (a.exDate < b.exDate ? -1 : 1)),
  };
}
