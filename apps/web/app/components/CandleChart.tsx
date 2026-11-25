"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  createChart,
  createSeriesMarkers,
  type AutoscaleInfo,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type UTCTimestamp,
  type WhitespaceData,
} from "lightweight-charts";
import {
  chartOptions,
  drawInDuration,
  easeOut,
  readChartPalette,
  withAlpha,
  type ChartPalette,
} from "@/lib/chart-theme";
import { utcMidnight } from "@/lib/dates";
import { formatPrice, formatShares } from "@/lib/format";
import {
  barOn,
  splitLabel,
  type Candle,
  type ChartFill,
  type ChartInterval,
  type Split,
} from "@/lib/stock-chart";

/** A fill and the bar it is marked on (`placeFills` in lib/stock-chart.ts). */
type PlacedFill = ChartFill & { time: string };

type CandleChartProps = {
  candles: Candle[];
  /** What a bar spans; a weekly bar is dated by its week's first session. */
  interval?: ChartInterval;
  /** Accessible name, e.g. "NVDA daily candles, split-adjusted". */
  label: string;
  /** Splits to mark above their ex-date bar; pass them for raw prices only. */
  splits?: Split[];
  /**
   * The user's fills to mark: a buy under its bar, a sell over it. Each is
   * already placed on a bar in `candles`, oldest first.
   */
  fills?: PlacedFill[];
};

// Session dates as UTC midnight: daily bars have no intraday time.
const toTime = (date: string) =>
  (utcMidnight(date).getTime() / 1000) as UTCTimestamp;

// A stable default: a fresh [] per render would rebuild the chart on every
// crosshair move.
const noSplits: Split[] = [];
const noFills: PlacedFill[] = [];

const volumeFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

/**
 * Daily or weekly candles over a volume pane (lightweight-charts). Prices arrive as
 * decimal strings and become numbers only here, at the drawing edge.
 *
 * The first chart a mount shows draws in left to right. New data on a
 * mounted chart and theme repaints appear at once, so live updates never
 * replay it.
 */
export function CandleChart({
  candles,
  interval = "1d",
  label,
  splits = noSplits,
  fills = noFills,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const drawnIn = useRef(false);
  const [hovered, setHovered] = useState<Candle | null>(null);
  const byTime = useMemo(
    () => new Map(candles.map((candle) => [toTime(candle.time), candle])),
    [candles]
  );
  const fillsByTime = useMemo(() => {
    const grouped = new Map<string, PlacedFill[]>();
    for (const fill of fills) {
      grouped.set(fill.time, [...(grouped.get(fill.time) ?? []), fill]);
    }
    return grouped;
  }, [fills]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const priceBars = candles.map(
      (candle): CandlestickData<UTCTimestamp> => ({
        time: toTime(candle.time),
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
      })
    );
    const low = Math.min(...priceBars.map((bar) => bar.low));
    const high = Math.max(...priceBars.map((bar) => bar.high));
    const maxVolume = Math.max(...candles.map((c) => Number(c.volume)));

    const duration = drawInDuration();
    const animate = !drawnIn.current && duration > 0 && candles.length > 1;
    drawnIn.current = true;
    // Bars from `shown` on are whitespace: they hold their slot on the time
    // scale, so the view is already fitted to the whole range while they draw.
    let shown = animate ? 0 : candles.length;
    const drawing = () => shown < candles.length;

    const palette = readChartPalette();
    const chart: IChartApi = createChart(container, {
      ...chartOptions(palette),
      autoSize: true,
    });
    // While drawing, both scales hold the full range's bounds, so the axes
    // don't rescale as bars appear.
    const price: ISeriesApi<"Candlestick"> = chart.addSeries(
      CandlestickSeries,
      {
        borderVisible: false,
        autoscaleInfoProvider: (base: () => AutoscaleInfo | null) =>
          drawing()
            ? { priceRange: { minValue: low, maxValue: high } }
            : base(),
      }
    );
    const volume = chart.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: "volume" },
        lastValueVisible: false,
        priceLineVisible: false,
        autoscaleInfoProvider: (base: () => AutoscaleInfo | null) =>
          drawing()
            ? { priceRange: { minValue: 0, maxValue: maxVolume } }
            : base(),
      },
      1
    );
    chart.panes()[1]?.setHeight(110);
    // On raw prices a split reads as a crash (or a spike, if reversed); the
    // marker says why. The user's fills are marked on either price mode: by
    // their bar, not their price, so an adjustment can't misplace them.
    const markers = createSeriesMarkers(price);

    let colors = palette;
    const draw = () => {
      price.setData(
        priceBars.map(
          (
            bar,
            i
          ): CandlestickData<UTCTimestamp> | WhitespaceData<UTCTimestamp> =>
            i < shown ? bar : { time: bar.time }
        )
      );
      volume.setData(
        candles.map(
          (
            candle,
            i
          ): HistogramData<UTCTimestamp> | WhitespaceData<UTCTimestamp> =>
            i < shown
              ? {
                  time: toTime(candle.time),
                  value: Number(candle.volume),
                  color: withAlpha(
                    Number(candle.close) >= Number(candle.open)
                      ? colors.up
                      : colors.down,
                    0.45
                  ),
                }
              : { time: toTime(candle.time) }
        )
      );
      const lastShown = priceBars[shown - 1]?.time ?? 0;
      const marks: SeriesMarker<UTCTimestamp>[] = [
        // A marker needs a bar to sit on: on weekly bars a split's ex-date is
        // rarely one, so it goes on the week it fell in.
        ...splits.flatMap((split): SeriesMarker<UTCTimestamp>[] => {
          const bar = barOn(candles, split.exDate);
          return bar === undefined
            ? []
            : [
                {
                  time: toTime(bar),
                  position: "aboveBar",
                  shape: "arrowDown",
                  color: colors.marker,
                  text: splitLabel(split),
                },
              ];
        }),
        // The letter carries the side, so it doesn't rest on color alone.
        ...fills.map(
          (fill): SeriesMarker<UTCTimestamp> => ({
            time: toTime(fill.time),
            position: fill.side === "buy" ? "belowBar" : "aboveBar",
            shape: fill.side === "buy" ? "arrowUp" : "arrowDown",
            color: fill.side === "buy" ? colors.up : colors.down,
            text: fill.side === "buy" ? "B" : "S",
          })
        ),
      ];
      // The series wants its markers in time order.
      markers.setMarkers(
        marks
          .filter((mark) => mark.time <= lastShown)
          .sort((a, b) => a.time - b.time)
      );
    };

    const paint = (next: ChartPalette) => {
      colors = next;
      chart.applyOptions(chartOptions(colors));
      price.applyOptions({
        upColor: colors.up,
        downColor: colors.down,
        wickUpColor: colors.up,
        wickDownColor: colors.down,
      });
      draw();
    };

    paint(palette);
    chart.timeScale().fitContent();

    let frame: number | undefined;
    if (animate) {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        shown = Math.max(1, Math.ceil(easeOut(t) * candles.length));
        draw();
        frame = t < 1 ? requestAnimationFrame(step) : undefined;
      };
      frame = requestAnimationFrame(step);
    }

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
      // An interrupted draw-in (Strict Mode's remount in dev) runs again on
      // the next mount.
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
        drawnIn.current = false;
      }
      observer.disconnect();
      chart.remove();
    };
  }, [candles, byTime, splits, fills]);

  const shown = hovered ?? candles.at(-1);
  const shownFills = shown ? (fillsByTime.get(shown.time) ?? noFills) : noFills;

  // The OHLCV readout follows the crosshair, so it isn't the figure's caption:
  // an accessible name that changes on every mouse move is noise. The chart's
  // name is its `label`.
  return (
    <figure className="m-0 grid gap-3">
      {shown ? (
        <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-secondary">
          <span className="text-foreground">
            {interval === "1w" ? "Week of " : null}
            <time dateTime={shown.time}>{shown.time}</time>
          </span>
          <span>O {formatPrice(shown.open)}</span>
          <span>H {formatPrice(shown.high)}</span>
          <span>L {formatPrice(shown.low)}</span>
          <span>C {formatPrice(shown.close)}</span>
          <span>V {volumeFormat.format(Number(shown.volume))}</span>
          {shownFills.map((fill, index) => (
            <span key={index} className="text-foreground">
              {fill.side === "buy" ? "Bought" : "Sold"}{" "}
              {formatShares(fill.quantity)} at {formatPrice(fill.price)}
            </span>
          ))}
        </p>
      ) : null}
      <div
        ref={containerRef}
        role="img"
        aria-label={label}
        className="h-[26rem] w-full sm:h-[32rem]"
      />
    </figure>
  );
}
