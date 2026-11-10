import type { components } from "@astraq/sdk";
import { bin, max } from "d3-array";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { isIsoDate } from "./dates";
import {
  chartRanges,
  defaultRange,
  type ChartRange,
  type CustomRange,
} from "./stock-chart";

// The returns distribution view (docs/ui-plan.md § Analysis, ROADMAP Phase 2
// item 7): its URL state and the histogram geometry. D3 computes here (bins,
// scales, the curve path); React draws the result in ReturnsHistogram.tsx.
// See ADR 0007 for why D3 never touches the DOM.

export type ReturnSeries = components["schemas"]["ReturnSeries_Output"];
export type ReturnStats = components["schemas"]["ReturnStats_Output"];
export type DailyReturn = components["schemas"]["DailyReturn_Output"];

/** Price basis of the returns. `all` includes dividends: a total return. */
export const returnsAdjustments = ["all", "split"] as const;
export type ReturnsAdjustment = (typeof returnsAdjustments)[number];

// The api's TickerParam rule (packages/shared), so a bad `?symbol=` is caught
// before a request goes out.
const tickerPattern = /^[A-Za-z][A-Za-z0-9.-]{0,15}$/;

/**
 * Reads `?symbol=&range=&adjustment=&from=&to=` leniently, like the stock
 * chart: unknown values fall back to the default, a valid custom range wins
 * over a preset, and a symbol that can't be a ticker reads as none.
 */
export function parseReturnsParams(
  params: Record<string, string | string[] | undefined>
) {
  const raw = typeof params.symbol === "string" ? params.symbol.trim() : "";
  const symbol = tickerPattern.test(raw) ? raw.toUpperCase() : null;
  const range =
    chartRanges.find((value) => value === params.range) ?? defaultRange;
  const adjustment =
    returnsAdjustments.find((value) => value === params.adjustment) ?? "all";
  const { from, to } = params;
  const custom: CustomRange | null =
    isIsoDate(from) && isIsoDate(to) && from <= to ? { from, to } : null;
  return { symbol, range, adjustment, custom };
}

/** The view's URL for a preset range or a custom one. */
export function returnsHref(
  view: { symbol: string; adjustment: ReturnsAdjustment } & (
    | { range: ChartRange }
    | { custom: CustomRange }
  )
): string {
  const query = new URLSearchParams({ symbol: view.symbol });
  if ("custom" in view) {
    query.set("from", view.custom.from);
    query.set("to", view.custom.to);
  } else {
    query.set("range", view.range);
  }
  query.set("adjustment", view.adjustment);
  return `/analysis/returns?${query}`;
}

/** "+1.23%" / "-0.45%" / "0.00%": a return or a statistic for display. */
export const signedPercent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

/** "60.0%": a share or a deviation, which have no sign. */
export const plainPercent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

/** Axis ticks: short, signed, one decimal at most. */
export const tickPercent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

export type HistogramBar = {
  /** The bucket's return range, lower edge inclusive. */
  x0: number;
  x1: number;
  /** Sessions whose return fell in the bucket. */
  count: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Tick = { value: number; offset: number };

export type HistogramLayout = {
  width: number;
  height: number;
  /** The drawing area inside the margins, relative to the SVG. */
  plot: { left: number; top: number; width: number; height: number };
  bars: HistogramBar[];
  /**
   * The normal distribution with the series' mean and deviation, scaled to
   * the same day counts as the bars, as an SVG path; null without a spread.
   */
  curve: string | null;
  /** Where the mean falls on the x axis; null without stats. */
  meanX: number | null;
  xTicks: Tick[];
  yTicks: Tick[];
};

/** The SVG's coordinate space; it scales to its container by viewBox. */
export const histogramSize = { width: 720, height: 360 } as const;
const margin = { top: 12, right: 16, bottom: 36, left: 40 };

/**
 * How many buckets for `n` returns: about 1.5 √n, so a year of sessions
 * gets ~24 and ten years ~75 before the cap. D3 then picks "nice" edges
 * near that count, so the labels read as round percentages.
 */
export function binCount(n: number): number {
  return Math.max(8, Math.min(60, Math.round(Math.sqrt(n) * 1.5)));
}

/**
 * Bins the returns and lays out bars, axes, the mean marker, and the normal
 * curve in SVG coordinates. Pure: the same inputs give the same layout, so
 * it's unit-tested and runs on the server or in the browser alike.
 *
 * The curve is the normal density scaled by `n × bin width`, which turns a
 * probability density into an expected day count per bucket, the unit the
 * bars are in. The two outer bins can be narrower (D3 clamps them to the
 * data's extent), so the width comes from a middle bin.
 */
export function histogramLayout(
  returns: number[],
  stats: { mean: number; stdDev: number | null } | null,
  size: { width: number; height: number } = histogramSize
): HistogramLayout {
  const plot = {
    left: margin.left,
    top: margin.top,
    width: size.width - margin.left - margin.right,
    height: size.height - margin.top - margin.bottom,
  };
  const empty: HistogramLayout = {
    ...size,
    plot,
    bars: [],
    curve: null,
    meanX: null,
    xTicks: [],
    yTicks: [],
  };
  if (returns.length === 0) return empty;

  const bins = bin().thresholds(binCount(returns.length))(returns);
  const first = bins[0];
  const last = bins[bins.length - 1];
  if (!first || !last || first.x0 === undefined || last.x1 === undefined) {
    return empty;
  }
  // A single distinct value makes one zero-width bin; give it some room.
  const lo = first.x0;
  const hi = last.x1 > lo ? last.x1 : lo + Math.max(Math.abs(lo), 0.01);
  const x = scaleLinear().domain([lo, hi]).range([0, plot.width]);

  const middle = bins[Math.floor(bins.length / 2)]!;
  const binWidth =
    middle.x1 !== undefined && middle.x0 !== undefined
      ? middle.x1 - middle.x0
      : hi - lo;
  const peak = max(bins, (bucket) => bucket.length) ?? 0;

  let density: ((value: number) => number) | null = null;
  if (stats && stats.stdDev !== null && stats.stdDev > 0) {
    const { mean, stdDev } = stats;
    const scale = returns.length * binWidth;
    density = (value) =>
      (scale * Math.exp(-((value - mean) ** 2) / (2 * stdDev ** 2))) /
      (stdDev * Math.sqrt(2 * Math.PI));
  }
  const top = Math.max(peak, density && stats ? density(stats.mean) : 0);
  const y = scaleLinear().domain([0, top]).nice().range([plot.height, 0]);

  const bars = bins.flatMap<HistogramBar>((bucket) => {
    if (bucket.x0 === undefined || bucket.x1 === undefined) return [];
    const left = x(bucket.x0);
    const right = x(bucket.x1);
    return [
      {
        x0: bucket.x0,
        x1: bucket.x1,
        count: bucket.length,
        x: left + 0.5,
        y: y(bucket.length),
        width: Math.max(right - left - 1, 1),
        height: plot.height - y(bucket.length),
      },
    ];
  });

  let curve: string | null = null;
  if (density) {
    const steps = 100;
    const points = Array.from(
      { length: steps + 1 },
      (_, index) => lo + ((hi - lo) * index) / steps
    );
    curve = line<number>()
      .x((value) => x(value))
      .y((value) => y(density(value)))(points);
  }

  const meanX =
    stats && stats.mean >= lo && stats.mean <= hi ? x(stats.mean) : null;

  return {
    ...size,
    plot,
    bars,
    curve,
    meanX,
    xTicks: x.ticks(8).map((value) => ({ value, offset: x(value) })),
    yTicks: y
      .ticks(5)
      .filter((value) => Number.isInteger(value))
      .map((value) => ({ value, offset: y(value) })),
  };
}

/** "-2.0% to -1.5%: 7 days (2.8%)", what hovering a bar reports. */
export function barLabel(bar: HistogramBar, total: number): string {
  const days = bar.count === 1 ? "day" : "days";
  const share = total > 0 ? plainPercent.format(bar.count / total) : "0%";
  return `${tickPercent.format(bar.x0)} to ${tickPercent.format(bar.x1)}: ${bar.count} ${days} (${share})`;
}
