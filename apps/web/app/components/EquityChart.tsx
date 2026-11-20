"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaSeries,
  LineSeries,
  LineStyle,
  createChart,
  type UTCTimestamp,
} from "lightweight-charts";
import { SignedMoney } from "@/app/components/SignedMoney";
import {
  chartOptions,
  readChartPalette,
  withAlpha,
  type ChartPalette,
} from "@/lib/chart-theme";
import { utcMidnight } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import type { PricedEquityPoint } from "@/lib/portfolios";

type EquityChartProps = {
  /** Oldest first, every one with an equity. */
  points: PricedEquityPoint[];
  /** Accessible name, e.g. "Equity of Main at each day's close". */
  label: string;
};

// Session dates as UTC midnight, like the candle chart.
const toTime = (date: string) =>
  (utcMidnight(date).getTime() / 1000) as UTCTimestamp;

/**
 * A portfolio's equity at each day's close over the cash paid in, so a
 * deposit reads as a step in both lines and not as a gain
 * (lightweight-charts: time on the x axis, ADR 0007). Amounts arrive as
 * decimal strings and become numbers only here, at the drawing edge.
 *
 * The readout above the chart follows the crosshair and rests on the last
 * day; the figures themselves are on the page beside it.
 */
export function EquityChart({ points, label }: EquityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<PricedEquityPoint | null>(null);
  const byTime = useMemo(
    () => new Map(points.map((point) => [toTime(point.date), point])),
    [points]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      ...chartOptions(readChartPalette()),
      autoSize: true,
    });
    const paidIn = chart.addSeries(LineSeries, {
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    const equity = chart.addSeries(AreaSeries, {
      lineWidth: 2,
      priceLineVisible: false,
    });
    paidIn.setData(
      points.map((point) => ({
        time: toTime(point.date),
        value: Number(point.capital),
      }))
    );
    equity.setData(
      points.map((point) => ({
        time: toTime(point.date),
        value: Number(point.equity),
      }))
    );

    const paint = (palette: ChartPalette) => {
      chart.applyOptions(chartOptions(palette));
      paidIn.applyOptions({ color: palette.axis });
      equity.applyOptions({
        lineColor: palette.marker,
        topColor: withAlpha(palette.marker, 0.28),
        bottomColor: withAlpha(palette.marker, 0.02),
      });
    };
    paint(readChartPalette());
    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      setHovered(
        param.time ? (byTime.get(param.time as UTCTimestamp) ?? null) : null
      );
    });

    // Theme and mode live on <html>; repaint when either changes.
    const observer = new MutationObserver(() => paint(readChartPalette()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-mode", "class", "style"],
    });

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [points, byTime]);

  const shown = hovered ?? points.at(-1);

  return (
    <figure className="m-0 grid gap-3">
      {shown ? (
        <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-secondary">
          <time dateTime={shown.date} className="text-foreground">
            {shown.date}
          </time>
          <span>Equity {formatMoney(shown.equity)}</span>
          <span>Paid in {formatMoney(shown.capital)}</span>
          <span className="inline-flex items-center gap-1">
            Day <SignedMoney value={shown.pnl} />
          </span>
        </p>
      ) : null}
      <div
        ref={containerRef}
        role="img"
        aria-label={label}
        className="h-64 w-full sm:h-80"
      />
    </figure>
  );
}
