"use client";

import { useTransition } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { DateRangePicker } from "@astraq/ui";
import {
  chartHref,
  type ChartAdjustment,
  type CustomRange,
} from "@/lib/stock-chart";

type CustomRangePickerProps = {
  ticker: string;
  adjustment: ChartAdjustment;
  /** The active custom range, or null while a preset is showing. */
  value: CustomRange | null;
  /** Latest pickable date, YYYY-MM-DD. */
  max: string;
};

/**
 * The stock chart's custom range. Picking one navigates to `?from=&to=`, so
 * the server still renders the chart and the view stays a link. Remounted per
 * URL by its key, so choosing a preset clears it.
 */
export function CustomRangePicker({
  ticker,
  adjustment,
  value,
  max,
}: CustomRangePickerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <DateRangePicker
      aria-label="Custom range"
      size="sm"
      max={max}
      defaultValue={value ? { start: value.from, end: value.to } : null}
      onChange={(next) => {
        // Typing fires this for half-finished or out-of-bounds ranges too.
        if (!next || next.start > next.end || next.end > max) return;
        const href = chartHref(ticker, {
          custom: { from: next.start, to: next.end },
          adjustment,
        });
        startTransition(() => router.push(href as Route, { scroll: false }));
      }}
      className={pending ? "w-auto opacity-70" : "w-auto"}
    />
  );
}
