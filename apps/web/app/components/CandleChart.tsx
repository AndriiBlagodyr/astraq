"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  createChart,
  createSeriesMarkers,
  type AutoscaleInfo,
  type CandlestickData,
  type DeepPartial,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type ChartOptions,
  type UTCTimestamp,
  type WhitespaceData,
} from "lightweight-charts";
import { splitLabel, type Candle, type Split } from "@/lib/stock-chart";

type CandleChartProps = {
  candles: Candle[];
  /** Accessible name, e.g. "NVDA daily candles, split-adjusted". */
  label: string;
  /** Splits to mark above their ex-date bar; pass them for raw prices only. */
  splits?: Split[];
};

type Palette = {
  up: string;
  down: string;
  grid: string;
  axis: string;
  border: string;
  marker: string;
  font: string;
};

// The chart draws on a canvas, so it can't use CSS variables directly: read
// the semantic tokens once per theme and hand over concrete colors.
function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    up: token("--ds-positive"),
    down: token("--ds-negative"),
    grid: token("--ds-chart-grid"),
    axis: token("--ds-chart-axis"),
    border: token("--ds-border-default"),
    marker: token("--ds-chart-1"),
    font: token("--ds-font-sans"),
  };
}

/** `#rrggbb` / `#rgb` / `rgb()` at the given opacity; other formats unchanged. */
function withAlpha(color: string, alpha: number): string {
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const rgb = color.match(/^rgba?\(([^,]+),([^,]+),([^,)]+)/);
  return rgb ? `rgba(${rgb[1]},${rgb[2]},${rgb[3]}, ${alpha})` : color;
}

function chartOptions(palette: Palette): DeepPartial<ChartOptions> {
  return {
    layout: {
      background: { type: ColorType.Solid, color: "transparent" },
      textColor: palette.axis,
      fontFamily: palette.font || undefined,
      panes: { separatorColor: palette.border },
    },
    grid: {
      vertLines: { color: palette.grid },
      horzLines: { color: palette.grid },
    },
    rightPriceScale: { borderColor: palette.border },
    timeScale: { borderColor: palette.border },
  };
}

/**
 * How long the first draw-in takes: the slowest motion token, or 0 under
 * reduced motion. The tokens already drop to 0ms there, but this is a JS
 * animation, so it checks for itself (docs/motion-and-delight-plan.md).
 */
function drawInDuration(): number {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
  const token = getComputedStyle(document.documentElement)
    .getPropertyValue("--ds-motion-slow")
    .trim();
  const value = parseFloat(token);
  if (!Number.isFinite(value)) return 0;
  return token.endsWith("ms") ? value : value * 1000;
}

// --ds-ease-out is cubic-bezier(0.22, 1, 0.36, 1), the classic ease-out
// quint; the closed form saves solving the bezier per frame.
const easeOut = (t: number) => 1 - (1 - t) ** 5;

// Session dates as UTC midnight: daily bars have no intraday time.
const toTime = (date: string) =>
  (Date.parse(`${date}T00:00:00Z`) / 1000) as UTCTimestamp;

// A stable default: a fresh [] per render would rebuild the chart on every
// crosshair move.
const noSplits: Split[] = [];

const volumeFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

/**
 * Daily candles over a volume pane (lightweight-charts). Prices arrive as
 * decimal strings and become numbers only here, at the drawing edge.
 *
 * The first chart a mount shows draws in left to right. New data on a
 * mounted chart and theme repaints appear at once, so live updates never
 * replay it.
 */
export function CandleChart({
  candles,
  label,
  splits = noSplits,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const drawnIn = useRef(false);
  const [hovered, setHovered] = useState<Candle | null>(null);
  const byTime = useMemo(
    () => new Map(candles.map((candle) => [toTime(candle.time), candle])),
    [candles]
  );

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

    const palette = readPalette();
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
    // marker says why.
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
      markers.setMarkers(
        splits
          .filter((split) => toTime(split.exDate) <= lastShown)
          .map((split) => ({
            time: toTime(split.exDate),
            position: "aboveBar",
            shape: "arrowDown",
            color: colors.marker,
            text: splitLabel(split),
          }))
      );
    };

    const paint = (next: Palette) => {
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
    const observer = new MutationObserver(() => paint(readPalette()));
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
  }, [candles, byTime, splits]);

  const shown = hovered ?? candles.at(-1);

  return (
    <figure className="m-0 grid gap-3">
      {shown ? (
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-secondary">
          <time dateTime={shown.time} className="text-foreground">
            {shown.time}
          </time>
          <span>O {shown.open}</span>
          <span>H {shown.high}</span>
          <span>L {shown.low}</span>
          <span>C {shown.close}</span>
          <span>V {volumeFormat.format(Number(shown.volume))}</span>
        </figcaption>
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
