"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  barLabel,
  histogramLayout,
  tickPercent,
  type DailyReturn,
  type ReturnStats,
} from "@/lib/returns-view";

type ReturnsHistogramProps = {
  returns: DailyReturn[];
  stats: ReturnStats | null;
  /** The accessible name: what is shown, over which range. */
  label: string;
};

/**
 * The returns distribution: a bar per return bucket, a normal curve with
 * the same mean and deviation, and a dashed line at the mean. D3 computed
 * the geometry in lib/returns-view.ts; this component only renders it, so
 * React owns the DOM (ADR 0007). Hovering or focusing a bar reports its
 * range and day count in the caption; the numbers themselves live in the
 * stats table beside the chart, so nothing depends on the picture.
 * The bars are one tab stop: Tab reaches the chart, the arrow keys (and
 * Home and End) walk the bars, and each bar is named by its range and
 * count, so a screen reader reads it on focus.
 * Colors come from the `--ds-chart-*` tokens and follow the theme.
 */
export function ReturnsHistogram({
  returns,
  stats,
  label,
}: ReturnsHistogramProps) {
  const values = useMemo(
    () => returns.map((point) => Number(point.return)),
    [returns]
  );
  const layout = useMemo(
    () =>
      histogramLayout(
        values,
        stats
          ? {
              mean: Number(stats.mean),
              stdDev: stats.stdDev === null ? null : Number(stats.stdDev),
            }
          : null
      ),
    [values, stats]
  );
  const [active, setActive] = useState<number | null>(null);
  // The bar Tab lands on: the last one visited, or the first.
  const [cursor, setCursor] = useState(0);
  const barRefs = useRef<(SVGRectElement | null)[]>([]);
  const titleId = useId();
  const total = values.length;
  const { plot } = layout;
  const activeBar = active === null ? null : (layout.bars[active] ?? null);
  const lastBar = layout.bars.length - 1;
  const tabStop = Math.min(cursor, lastBar);

  function onBarKeyDown(event: KeyboardEvent<SVGRectElement>, index: number) {
    const next =
      event.key === "ArrowRight"
        ? Math.min(lastBar, index + 1)
        : event.key === "ArrowLeft"
          ? Math.max(0, index - 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? lastBar
              : null;
    if (next === null) return;
    event.preventDefault();
    barRefs.current[next]?.focus();
  }

  return (
    <figure className="m-0 grid gap-2">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="h-auto w-full text-[11px]"
        role="group"
        aria-labelledby={titleId}
        onMouseLeave={() => setActive(null)}
      >
        <title id={titleId}>{label}</title>
        <g transform={`translate(${plot.left} ${plot.top})`}>
          {layout.yTicks.map((tick) => (
            <g key={tick.value} transform={`translate(0 ${tick.offset})`}>
              <line x2={plot.width} stroke="var(--ds-chart-grid)" />
              <text
                x={-8}
                dy="0.32em"
                textAnchor="end"
                fill="var(--ds-chart-axis)"
              >
                {tick.value}
              </text>
            </g>
          ))}
          <line
            y1={plot.height}
            y2={plot.height}
            x2={plot.width}
            stroke="var(--ds-chart-axis)"
          />
          {layout.xTicks.map((tick) => (
            <text
              key={tick.value}
              x={tick.offset}
              y={plot.height + 20}
              textAnchor="middle"
              fill="var(--ds-chart-axis)"
            >
              {tickPercent.format(tick.value)}
            </text>
          ))}

          {layout.bars.map((bar, index) => (
            <rect
              key={bar.x0}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={1}
              fill="var(--ds-chart-2)"
              fillOpacity={active === null || active === index ? 0.85 : 0.35}
              ref={(node) => {
                barRefs.current[index] = node;
              }}
              role="img"
              aria-label={barLabel(bar, total)}
              tabIndex={index === tabStop ? 0 : -1}
              onMouseEnter={() => setActive(index)}
              onFocus={() => {
                setActive(index);
                setCursor(index);
              }}
              onBlur={() => setActive(null)}
              onKeyDown={(event) => onBarKeyDown(event, index)}
              className="outline-none transition-[fill-opacity] duration-(--ds-motion-fast) focus-visible:stroke-[var(--ds-focus-ring)]"
            />
          ))}

          {layout.meanX !== null ? (
            <line
              x1={layout.meanX}
              x2={layout.meanX}
              y2={plot.height}
              stroke="var(--ds-chart-axis)"
              strokeDasharray="4 4"
            />
          ) : null}
          {layout.curve ? (
            <path
              d={layout.curve}
              fill="none"
              stroke="var(--ds-chart-6)"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          ) : null}
        </g>
      </svg>
      {/* Not a live region: a focused bar is announced by its own name. */}
      <figcaption className="m-0 min-h-5 text-sm text-muted tabular-nums">
        {activeBar
          ? barLabel(activeBar, total)
          : `${total} sessions. Bars count days per return bucket; the line is a normal distribution with the same mean and deviation, the dashes mark the mean. Arrow keys move between bars.`}
      </figcaption>
    </figure>
  );
}
