import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TickerParamSchema } from "@astraq/shared";
import { Card, EmptyState, buttonVariants } from "@astraq/ui";
import { AddToWatchlistMenu } from "@/app/components/AddToWatchlistMenu";
import { CandleChart } from "@/app/components/CandleChart";
import { DayChange } from "@/app/components/DayChange";
import { OrderTicket } from "@/app/components/OrderTicket";
import { PillLinks } from "@/app/components/PillLinks";
import { PositionSummary } from "@/app/components/PositionSummary";
import { RangeControls } from "@/app/components/RangeControls";
import { RecordStockView } from "@/app/components/RecentStocks";
import { formatPrice } from "@/lib/format";
import { findSymbol, getCandles } from "@/lib/market-data";
import { listPortfolios, symbolTrading } from "@/lib/portfolios";
import { listWatchlists } from "@/lib/watchlists";
import {
  chartAdjustments,
  chartHref,
  chartIntervals,
  fillCounts,
  marketDate,
  parseChartParams,
  placeFills,
  rangeStart,
  sessionChange,
  splitLabel,
  type ChartAdjustment,
  type ChartInterval,
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
const intervalLabels: Record<ChartInterval, string> = {
  "1d": "Daily",
  "1w": "Weekly",
};

// The stock page's Chart tab (docs/ui-plan.md § Stock page). Range and
// adjustment live in the URL, so every view is a link and the server renders
// it; only the chart itself is a client component. Since Phase 3 it also
// shows what the user holds of the symbol and marks their fills on the chart.
// Weekly bars (Phase 4) are the api's, from its weekly aggregate: the page
// only asks for another interval.
export default async function StockPage({
  params,
  searchParams,
}: StockPageProps) {
  const { symbol } = await params;
  // Not a ticker at all (`/stocks/123`): the api would answer 400, which
  // reads as "the chart couldn't load". It's a page that doesn't exist.
  if (!TickerParamSchema.safeParse({ ticker: symbol }).success) notFound();
  const { range, adjustment, interval, custom } = parseChartParams(
    await searchParams
  );
  const ticker = symbol.toUpperCase();
  const today = marketDate();

  // The user's position and fills hang off the portfolio index, so that
  // chain runs beside the market data instead of after it.
  const trading = listPortfolios().then(async (portfolios) => ({
    portfolios,
    ...(await symbolTrading(ticker, portfolios)),
  }));
  const [summary, series, watchlists, { portfolios, holdings, fills }] =
    await Promise.all([
      findSymbol(ticker),
      getCandles(ticker, {
        from: custom ? custom.from : rangeStart(range, today),
        to: custom?.to,
        adjustment,
        interval,
      }),
      listWatchlists(),
      trading,
    ]);
  if (!series) notFound();
  const marked = placeFills(fills, series.candles, custom?.to);

  // The header is today's quote, independent of the chart's range and price
  // mode: a custom range or raw prices mustn't turn it into a historical
  // price or a split into a -90% "day".
  const last = summary?.latestClose ? sessionChange(summary.latestClose) : null;
  // A preset link drops the custom dates; a price or bars link keeps
  // whichever is on.
  const href = (next: {
    range?: ChartRange;
    adjustment?: ChartAdjustment;
    interval?: ChartInterval;
  }) => {
    const view = next.range ?? custom ?? range;
    const rest = {
      adjustment: next.adjustment ?? adjustment,
      interval: next.interval ?? interval,
    };
    return chartHref(
      ticker,
      typeof view === "string"
        ? { range: view, ...rest }
        : { custom: view, ...rest }
    ) as Route;
  };
  const rangeLabel = custom ? `${custom.from} to ${custom.to}` : range;

  return (
    <main className="grid gap-5">
      <RecordStockView ticker={ticker} name={summary?.name ?? null} />
      <Card className="grid gap-3 p-7">
        <p className="m-0 text-sm text-muted">
          <Link href="/stocks" className="underline-offset-4 hover:underline">
            Stocks
          </Link>
          {summary ? ` · ${summary.exchange}` : null}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h1 className="m-0 font-display text-4xl font-bold tracking-tight text-foreground">
              {ticker}
            </h1>
            {summary ? (
              <p className="m-0 text-lg text-secondary">{summary.name}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/analysis/returns?symbol=${ticker}` as Route}
              className={buttonVariants({ variant: "secondary" })}
            >
              Returns
            </Link>
            <AddToWatchlistMenu ticker={ticker} watchlists={watchlists} />
            {/* Without a portfolio there is nothing to trade in: Trade leads to where one is opened. */}
            {portfolios.length > 0 ? (
              <OrderTicket
                portfolios={portfolios.map(({ id, name }) => ({ id, name }))}
                ticker={ticker}
              />
            ) : (
              <Link href="/portfolios" className={buttonVariants()}>
                Trade
              </Link>
            )}
          </div>
        </div>
        {last ? (
          <p className="m-0 flex flex-wrap items-center gap-3 tabular-nums">
            <span className="text-2xl font-semibold text-foreground">
              {formatPrice(last.close)}
            </span>
            <DayChange session={last} />
            <span className="text-sm text-muted">
              Close of <time dateTime={last.date}>{last.date}</time>
            </span>
          </p>
        ) : null}
      </Card>

      {holdings.length > 0 ? (
        <PositionSummary ticker={ticker} holdings={holdings} />
      ) : null}

      <Card className="grid gap-4 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <RangeControls
            range={range}
            custom={custom}
            today={today}
            target={{ page: "stock", ticker, adjustment, interval }}
            hrefFor={(value) => href({ range: value })}
          />
          <div className="flex flex-wrap items-center gap-2">
            <PillLinks
              label="Bars"
              items={chartIntervals.map((value) => ({
                key: value,
                text: intervalLabels[value],
                href: href({ interval: value }),
                current: value === interval,
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
        </div>

        {series.candles.length > 0 ? (
          <>
            <CandleChart
              candles={series.candles}
              interval={interval}
              label={`${ticker} ${intervalLabels[interval].toLowerCase()} candles, ${adjustmentLabels[adjustment].toLowerCase()}, ${rangeLabel}`}
              splits={adjustment === "raw" ? series.splits : undefined}
              fills={marked}
            />
            {marked.length > 0 ? (
              <p className="m-0 text-sm text-muted">
                Your fills in this range: {fillCounts(marked)}, marked B and S
                on the {interval === "1w" ? "week" : "session"} each filled in.
                Point at a bar to read its fills
                {adjustment === "split" && series.splits.length > 0
                  ? "; their prices are as traded, before any later split"
                  : null}
                .
              </p>
            ) : null}
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
