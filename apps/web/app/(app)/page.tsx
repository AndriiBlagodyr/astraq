import Link from "next/link";
import { connection } from "next/server";
import { Button, Card, EmptyState, Input, buttonVariants } from "@astraq/ui";
import { NoSymbolsLoaded } from "@/app/components/NoSymbolsLoaded";
import { RecentStocks } from "@/app/components/RecentStocks";
import { SymbolTable } from "@/app/components/SymbolTable";
import { WatchlistSummaryCard } from "@/app/components/WatchlistSummaryCard";
import { searchSymbols } from "@/lib/market-data";
import { getWatchlist, listWatchlists } from "@/lib/watchlists";

// Today, Phase 2 (docs/ui-plan.md § Today): each of the user's watchlists
// with last closes, day changes, and sparklines, then the stocks opened
// last. Until there's a watchlist, the Phase 1 view stands in: symbol
// search and every symbol with stored candles.

const loop = [
  "Watchlist",
  "Chart",
  "Strategy",
  "Honest backtest",
  "Paper trade",
  "Review",
];

export default async function TodayPage() {
  // Rendered per request. Without this the page has no dynamic input, so
  // `next build` prerenders it: the build then needs a live API, and the
  // deployed Today would show build-time closes until the next deploy.
  await connection();

  // The index carries no rows, so each list is read on its own; they go out
  // together. A list deleted in between reads as null and is left out.
  const summaries = await listWatchlists();
  const watchlists = (
    await Promise.all(summaries.map((summary) => getWatchlist(summary.id)))
  ).filter((watchlist) => watchlist !== null);
  const symbols = watchlists.length === 0 ? await searchSymbols() : [];

  return (
    <main className="grid gap-5">
      <Card className="grid gap-5 p-7">
        <h1 className="m-0 font-display text-4xl font-bold tracking-tight text-foreground">
          Veracand
        </h1>
        <p className="m-0 max-w-2xl leading-7 text-secondary">
          A personal market research lab for US equities. Backtests and paper
          trading share one fill model, every result sits next to a buy-and-hold
          benchmark, and look-ahead is ruled out by construction.
        </p>
        <ol
          className="m-0 flex list-none flex-wrap items-center gap-2 p-0"
          aria-label="Core loop"
        >
          {loop.map((step, index) => (
            <li
              key={step}
              className="flex items-center gap-2 text-sm text-secondary"
            >
              {index > 0 ? <span aria-hidden="true">→</span> : null}
              <span className="rounded-pill border border-border px-3 py-1 text-foreground">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </Card>

      {watchlists.map((watchlist) => (
        <WatchlistSummaryCard key={watchlist.id} watchlist={watchlist} />
      ))}

      {watchlists.length === 0 ? (
        <>
          <Card className="p-7">
            <EmptyState
              title="No watchlists yet"
              description="Today shows the symbols you follow. Make a list and add a few."
              headingLevel={2}
              action={
                <Link
                  href="/watchlists#new"
                  className={buttonVariants({ size: "sm" })}
                >
                  New watchlist
                </Link>
              }
            />
          </Card>

          <Card className="grid gap-4 p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="m-0 text-xl font-semibold text-foreground">
                Stocks
              </h2>
              <form
                action="/stocks"
                className="flex flex-wrap items-end gap-2"
                role="search"
              >
                <label className="sr-only" htmlFor="today-search">
                  Ticker or company name
                </label>
                <Input
                  id="today-search"
                  name="q"
                  type="search"
                  placeholder="NVDA, Apple…"
                />
                <Button type="submit" size="sm">
                  Search
                </Button>
              </form>
            </div>
            {symbols.length > 0 ? (
              <SymbolTable
                symbols={symbols}
                caption="Loaded symbols with their last close"
              />
            ) : (
              <NoSymbolsLoaded />
            )}
          </Card>
        </>
      ) : null}

      <RecentStocks />
    </main>
  );
}
