import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, EmptyState } from "@astraq/ui";
import { CandleChart } from "@/app/components/CandleChart";
import { DayChange } from "@/app/components/DayChange";
import { findSymbol, getDailyCandles } from "@/lib/market-data";
import {
  chartAdjustments,
  chartRanges,
  lastSession,
  parseChartParams,
  rangeStart,
  splitLabel,
  type ChartAdjustment,
  type ChartRange,
} from "@/lib/stock-chart";

type StockPageProps = {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: StockPageProps): Promise<Metadata> {
  const { symbol } = await params;
  return { title: symbol.toUpperCase() };
}

const adjustmentLabels: Record<ChartAdjustment, string> = {
  split: "Split-adjusted",
  raw: "Raw",
};

// The stock page's Chart tab (docs/ui-plan.md § Stock page). Range and
// adjustment live in the URL, so every view is a link and the server renders
// it; only the chart itself is a client component.
export default async function StockPage({
  params,
  searchParams,
}: StockPageProps) {
  const { symbol } = await params;
  const { range, adjustment } = parseChartParams(await searchParams);
  const ticker = symbol.toUpperCase();
  const today = new Date().toISOString().slice(0, 10);

  const [summary, series] = await Promise.all([
    findSymbol(ticker),
    getDailyCandles(ticker, { from: rangeStart(range, today), adjustment }),
  ]);
  if (!series) notFound();

  const last = lastSession(series.candles);
  const href = (next: { range?: ChartRange; adjustment?: ChartAdjustment }) => {
    const query = new URLSearchParams({
      range: next.range ?? range,
      adjustment: next.adjustment ?? adjustment,
    });
    return `/stocks/${ticker}?${query}` as Route;
  };

  return (
    <main className="grid gap-5">
      <Card className="grid gap-3 p-7">
        <p className="m-0 text-sm text-muted">
          <Link href="/stocks" className="underline-offset-4 hover:underline">
            Stocks
          </Link>
          {summary ? ` · ${summary.exchange}` : null}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h1 className="m-0 font-display text-4xl font-bold tracking-tight text-foreground">
            {ticker}
          </h1>
          {summary ? (
            <p className="m-0 text-lg text-secondary">{summary.name}</p>
          ) : null}
        </div>
        {last ? (
          <p className="m-0 flex flex-wrap items-center gap-3 tabular-nums">
            <span className="text-2xl font-semibold text-foreground">
              {last.close}
            </span>
            <DayChange session={last} />
            <span className="text-sm text-muted">
              Close of <time dateTime={last.date}>{last.date}</time>
            </span>
          </p>
        ) : null}
      </Card>

      <Card className="grid gap-4 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PillLinks
            label="Range"
            items={chartRanges.map((value) => ({
              key: value,
              text: value,
              href: href({ range: value }),
              current: value === range,
            }))}
          />
          <PillLinks
            label="Prices"
            items={chartAdjustments.map((value) => ({
              key: value,
              text: adjustmentLabels[value],
              href: href({ adjustment: value }),
              current: value === adjustment,
            }))}
          />
        </div>

        {series.candles.length > 0 ? (
          <>
            <CandleChart
              candles={series.candles}
              label={`${ticker} daily candles, ${adjustmentLabels[adjustment].toLowerCase()}, ${range}`}
              splits={adjustment === "raw" ? series.splits : undefined}
            />
            {series.splits.length > 0 ? (
              <p className="m-0 text-sm text-muted">
                {adjustment === "raw"
                  ? "Raw prices jump on split days: "
                  : "Prices are adjusted for "}
                {series.splits.map((split, index) => (
                  <span key={split.exDate}>
                    {index > 0 ? ", " : null}
                    {splitLabel(split)} on{" "}
                    <time dateTime={split.exDate}>{split.exDate}</time>
                  </span>
                ))}
                .
              </p>
            ) : null}
          </>
        ) : (
          <EmptyState
            title="No candles in this range"
            description="Nothing is stored for these dates yet. The full history may still have bars."
            action={
              <Link
                href={href({ range: "Max" })}
                className="text-brand-strong-fg underline"
              >
                Show all history
              </Link>
            }
          />
        )}
      </Card>
    </main>
  );
}

type PillLink = { key: string; text: string; href: Route; current: boolean };

/** A row of links that reads as a segmented control; the current one is marked. */
function PillLinks({ label, items }: { label: string; items: PillLink[] }) {
  return (
    <nav aria-label={label}>
      <ul className="m-0 flex list-none flex-wrap gap-1 rounded-pill border border-border p-1">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              scroll={false}
              className="inline-flex min-h-8 items-center rounded-pill px-3 text-sm font-semibold text-muted hover:text-foreground aria-[current=page]:bg-surface-muted aria-[current=page]:text-foreground"
            >
              {item.text}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
