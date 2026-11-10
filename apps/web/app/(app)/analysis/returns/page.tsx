import type { Metadata, Route } from "next";
import Link from "next/link";
import { Button, Card, EmptyState, Input } from "@astraq/ui";
import { CustomRangePicker } from "@/app/components/CustomRangePicker";
import { PillLinks } from "@/app/components/PillLinks";
import { ReturnsHistogram } from "@/app/components/ReturnsHistogram";
import { ReturnStatsTable } from "@/app/components/ReturnStatsTable";
import { findSymbol, getDailyReturns } from "@/lib/market-data";
import {
  parseReturnsParams,
  returnsAdjustments,
  returnsHref,
  type ReturnsAdjustment,
} from "@/lib/returns-view";
import {
  chartRanges,
  marketDate,
  rangeStart,
  type ChartRange,
} from "@/lib/stock-chart";

type ReturnsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  searchParams,
}: ReturnsPageProps): Promise<Metadata> {
  const { symbol } = parseReturnsParams(await searchParams);
  return { title: symbol ? `${symbol} returns` : "Returns distribution" };
}

const adjustmentLabels: Record<ReturnsAdjustment, string> = {
  all: "Total return",
  split: "Price only",
};

/** The GET form that picks a symbol; it works before JavaScript loads. */
function SymbolForm({ current }: { current?: string }) {
  return (
    <form action="/analysis/returns" className="flex flex-wrap gap-2">
      <label className="sr-only" htmlFor="returns-symbol">
        Ticker
      </label>
      <Input
        id="returns-symbol"
        name="symbol"
        defaultValue={current}
        placeholder="Ticker, e.g. NVDA"
        autoComplete="off"
        spellCheck={false}
        required
        pattern="[A-Za-z][A-Za-z0-9.\-]{0,15}"
        className="w-44"
      />
      <Button type="submit" variant="secondary">
        Show
      </Button>
    </form>
  );
}

// The first D3 view (docs/ui-plan.md § Analysis, ROADMAP Phase 2 item 7).
// Symbol, range, and price basis live in the URL, so every view is a link
// and the server renders it; only the histogram's hover is client-side.
export default async function ReturnsPage({ searchParams }: ReturnsPageProps) {
  const { symbol, range, adjustment, custom } = parseReturnsParams(
    await searchParams
  );
  const today = marketDate();

  const intro = (
    <Card className="grid gap-3 p-7">
      <p className="m-0 text-sm text-muted">Analysis</p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="m-0 font-display text-3xl font-bold tracking-tight text-foreground">
            Returns distribution
          </h1>
          <p className="m-0 text-secondary">
            How a stock&apos;s daily moves are spread out, against the bell
            curve a normal distribution would give.
          </p>
        </div>
        <SymbolForm current={symbol ?? undefined} />
      </div>
    </Card>
  );

  if (!symbol) {
    return (
      <main className="grid gap-5">
        {intro}
        <Card className="p-7">
          <EmptyState
            title="Pick a symbol"
            description="Enter a ticker above, or open the Returns link on any stock page or watchlist row."
          />
        </Card>
      </main>
    );
  }

  const [summary, series] = await Promise.all([
    findSymbol(symbol),
    getDailyReturns(symbol, {
      from: custom ? custom.from : rangeStart(range, today),
      to: custom?.to,
      adjustment,
    }),
  ]);

  if (!series) {
    return (
      <main className="grid gap-5">
        {intro}
        <Card className="p-7">
          <EmptyState
            title={`Unknown symbol ${symbol}`}
            description="Veracand has no data for this ticker."
            action={
              <Link href="/stocks" className="text-brand-strong-fg underline">
                Search stocks
              </Link>
            }
          />
        </Card>
      </main>
    );
  }

  const href = (next: {
    range?: ChartRange;
    adjustment?: ReturnsAdjustment;
  }) => {
    const view = next.range ?? custom ?? range;
    const nextAdjustment = next.adjustment ?? adjustment;
    return returnsHref(
      typeof view === "string"
        ? { symbol, range: view, adjustment: nextAdjustment }
        : { symbol, custom: view, adjustment: nextAdjustment }
    ) as Route;
  };
  const rangeLabel = custom ? `${custom.from} to ${custom.to}` : range;

  return (
    <main className="grid gap-5">
      {intro}

      <Card className="grid gap-4 p-5 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link
              href={`/stocks/${symbol}` as Route}
              className="font-display text-2xl font-bold tracking-tight text-foreground underline-offset-4 hover:underline"
            >
              {symbol}
            </Link>
            {summary ? (
              <span className="text-secondary">{summary.name}</span>
            ) : null}
          </p>
          <p className="m-0 text-sm text-muted">
            Daily returns, {adjustmentLabels[adjustment].toLowerCase()},{" "}
            {rangeLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <PillLinks
              label="Range"
              items={chartRanges.map((value) => ({
                key: value,
                text: value,
                href: href({ range: value }),
                current: !custom && value === range,
              }))}
            />
            <CustomRangePicker
              key={custom ? `${custom.from}/${custom.to}` : "preset"}
              target={{ page: "returns", symbol, adjustment }}
              value={custom}
              max={today}
            />
          </div>
          <PillLinks
            label="Basis"
            items={returnsAdjustments.map((value) => ({
              key: value,
              text: adjustmentLabels[value],
              href: href({ adjustment: value }),
              current: value === adjustment,
            }))}
          />
        </div>

        {series.stats ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <ReturnsHistogram
              returns={series.returns}
              stats={series.stats}
              label={`${symbol} daily returns, ${adjustmentLabels[adjustment].toLowerCase()}, ${rangeLabel}: ${series.stats.count} sessions as a histogram with a normal curve`}
            />
            <ReturnStatsTable stats={series.stats} />
          </div>
        ) : (
          <EmptyState
            title="No returns in this range"
            description="A return needs two consecutive stored sessions. The full history may have them."
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
        <p className="m-0 text-sm text-muted">
          {adjustment === "all"
            ? "Total return: closes are adjusted for splits and dividends, so an ex-dividend day isn't counted as a loss."
            : "Price only: closes are split-adjusted, so an ex-dividend day shows the price drop as a loss."}
        </p>
      </Card>
    </main>
  );
}
