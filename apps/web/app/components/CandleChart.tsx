"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  createChart,
  type CandlestickData,
  type DeepPartial,
  type IChartApi,
  type ISeriesApi,
  type ChartOptions,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/stock-chart";

type CandleChartProps = {
  candles: Candle[];
  /** Accessible name, e.g. "NVDA daily candles, split-adjusted". */
  label: string;
};

type Palette = {
  up: string;
  down: string;
  grid: string;
  axis: string;
  border: string;
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

// Session dates as UTC midnight: daily bars have no intraday time.
const toTime = (date: string) =>
  (Date.parse(`${date}T00:00:00Z`) / 1000) as UTCTimestamp;

const volumeFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

/**
 * Daily candles over a volume pane (lightweight-charts). Prices arrive as
 * decimal strings and become numbers only here, at the drawing edge.
 */
export function CandleChart({ candles, label }: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<Candle | null>(null);
  const byTime = useMemo(
    () => new Map(candles.map((candle) => [toTime(candle.time), candle])),
    [candles]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const palette = readPalette();
    const chart: IChartApi = createChart(container, {
      ...chartOptions(palette),
      autoSize: true,
    });
    const price: ISeriesApi<"Candlestick"> = chart.addSeries(
      CandlestickSeries,
      {
        borderVisible: false,
      }
    );
    const volume = chart.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: "volume" },
        lastValueVisible: false,
        priceLineVisible: false,
      },
      1
    );
    chart.panes()[1]?.setHeight(110);

    const paint = (colors: Palette) => {
      chart.applyOptions(chartOptions(colors));
      price.applyOptions({
        upColor: colors.up,
        downColor: colors.down,
        wickUpColor: colors.up,
        wickDownColor: colors.down,
      });
      volume.setData(
        candles.map((candle) => ({
          time: toTime(candle.time),
          value: Number(candle.volume),
          color: withAlpha(
            Number(candle.close) >= Number(candle.open)
              ? colors.up
              : colors.down,
            0.45
          ),
        }))
      );
    };

    price.setData(
      candles.map(
        (candle): CandlestickData<UTCTimestamp> => ({
          time: toTime(candle.time),
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
        })
      )
    );
    paint(palette);
    chart.timeScale().fitContent();

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
      observer.disconnect();
      chart.remove();
    };
  }, [candles, byTime]);

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
