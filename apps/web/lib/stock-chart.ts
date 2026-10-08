import type { components } from "@astraq/sdk";

export type Candle = components["schemas"]["Candle_Output"];
export type LatestClose = components["schemas"]["LatestClose_Output"];
export type Split = components["schemas"]["Split_Output"];

/** The chart's range presets, in the order the picker shows them. */
export const chartRanges = ["1M", "6M", "1Y", "5Y", "Max"] as const;
export type ChartRange = (typeof chartRanges)[number];
export const defaultRange: ChartRange = "1Y";

const rangeMonths: Record<Exclude<ChartRange, "Max">, number> = {
  "1M": 1,
  "6M": 6,
  "1Y": 12,
  "5Y": 60,
};

/** The chart's price modes. `all` (dividends too) is for research views. */
export const chartAdjustments = ["split", "raw"] as const;
export type ChartAdjustment = (typeof chartAdjustments)[number];

/** Reads `?range=&adjustment=` leniently: anything unknown falls back to the default. */
export function parseChartParams(
  params: Record<string, string | string[] | undefined>
) {
  const range =
    chartRanges.find((value) => value === params.range) ?? defaultRange;
  const adjustment =
    chartAdjustments.find((value) => value === params.adjustment) ?? "split";
  return { range, adjustment };
}

/**
 * First session date of a range, counted back from `today` (YYYY-MM-DD), or
 * undefined for Max. Month arithmetic clamps to the month's last day, so
 * 1M before March 31 is February 28 (or 29), not March 3.
 */
export function rangeStart(
  range: ChartRange,
  today: string
): string | undefined {
  if (range === "Max") return undefined;
  const [year, month, day] = today.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 - rangeMonths[range], 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export type LastSession = {
  /** Session date of the latest bar. */
  date: string;
  close: string;
  /** Change from the previous close; null when there's only one bar. */
  change: number | null;
  changePercent: number | null;
};

/**
 * Last close and day change for display. Display-only arithmetic, so plain
 * numbers are fine here; the stored and served values stay decimal strings.
 */
export function sessionChange({
  date,
  close,
  previousClose,
}: LatestClose): LastSession {
  if (previousClose === null)
    return { date, close, change: null, changePercent: null };
  const change = Number(close) - Number(previousClose);
  return {
    date,
    close,
    change,
    changePercent: (change / Number(previousClose)) * 100,
  };
}

/** The stock page header's last close and day change, from its candles. */
export function lastSession(candles: Candle[]): LastSession | null {
  const last = candles.at(-1);
  if (!last) return null;
  return sessionChange({
    date: last.time,
    close: last.close,
    previousClose: candles.at(-2)?.close ?? null,
  });
}

/** "10-for-1 split", or "1-for-10 reverse split" when shares were merged. */
export function splitLabel({ from, to }: Split): string {
  const reverse = Number(from) > Number(to);
  return `${to}-for-${from} ${reverse ? "reverse split" : "split"}`;
}
