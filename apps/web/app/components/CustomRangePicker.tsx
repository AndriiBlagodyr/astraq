"use client";

import { useTransition } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { DateRangePicker } from "@astraq/ui";
import { returnsHref, type ReturnsAdjustment } from "@/lib/returns-view";
import {
  chartHref,
  type ChartAdjustment,
  type CustomRange,
} from "@/lib/stock-chart";

/**
 * Which page the picked range navigates to. A description rather than an
 * href builder, because a server component can't pass a function here.
 */
export type RangeTarget =
  | { page: "stock"; ticker: string; adjustment: ChartAdjustment }
  | { page: "returns"; symbol: string; adjustment: ReturnsAdjustment };

type CustomRangePickerProps = {
  target: RangeTarget;
  /** The active custom range, or null while a preset is showing. */
  value: CustomRange | null;
  /** Latest pickable date, YYYY-MM-DD. */
  max: string;
};

/** The target page's URL for a custom range. */
export function rangeHref(target: RangeTarget, custom: CustomRange): string {
  return target.page === "stock"
    ? chartHref(target.ticker, { custom, adjustment: target.adjustment })
    : returnsHref({
        symbol: target.symbol,
        custom,
        adjustment: target.adjustment,
      });
}

/**
 * A chart's custom range. Picking one navigates to `?from=&to=`, so the
 * server still renders the view and it stays a link. Remounted per URL by
 * its key, so choosing a preset clears it.
 */
export function CustomRangePicker({
  target,
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
        const href = rangeHref(target, { from: next.start, to: next.end });
        startTransition(() => router.push(href as Route, { scroll: false }));
      }}
      className={pending ? "w-auto opacity-70" : "w-auto"}
    />
  );
}
