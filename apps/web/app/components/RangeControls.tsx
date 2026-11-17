import type { Route } from "next";
import {
  chartRanges,
  type ChartRange,
  type CustomRange,
} from "@/lib/stock-chart";
import { CustomRangePicker, type RangeTarget } from "./CustomRangePicker";
import { PillLinks } from "./PillLinks";

/**
 * A view's range: the presets as links, then the custom date picker. For
 * every page whose range lives in the URL (the stock chart, the returns
 * distribution). A preset is current only while no custom range is on.
 */
export function RangeControls({
  range,
  custom,
  today,
  target,
  hrefFor,
}: {
  range: ChartRange;
  custom: CustomRange | null;
  /** Latest pickable date, YYYY-MM-DD. */
  today: string;
  /** Where a picked custom range navigates. */
  target: RangeTarget;
  /** The page's URL for a preset, keeping its other parameters. */
  hrefFor: (range: ChartRange) => Route;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PillLinks
        label="Range"
        items={chartRanges.map((value) => ({
          key: value,
          text: value,
          href: hrefFor(value),
          current: !custom && value === range,
        }))}
      />
      <CustomRangePicker
        key={custom ? `${custom.from}/${custom.to}` : "preset"}
        target={target}
        value={custom}
        max={today}
      />
    </div>
  );
}
