import { Button, Card, EmptyState, Input } from "@astraq/ui";
import { SymbolTable } from "@/app/components/SymbolTable";
import { searchSymbols } from "@/lib/market-data";

// Today, Phase 1 (docs/ui-plan.md § Today): symbol search plus every loaded
// symbol with its last close and day change. Watchlists replace the full
// list in Phase 2, once search covers the whole US universe.

const loop = ["Watchlist", "Chart", "Strategy", "Honest backtest", "Paper trade", "Review"];

export default async function TodayPage() {
  const symbols = await searchSymbols();

  return (
    <main className="grid gap-5">
      <Card className="grid gap-5 p-7">
        <h1 className="m-0 font-display text-4xl font-bold tracking-tight text-foreground">
          Veracand
        </h1>
        <p className="m-0 max-w-2xl leading-7 text-secondary">
          A personal market research lab for US equities. Backtests and paper trading share one fill
          model, every result sits next to a buy-and-hold benchmark, and look-ahead is ruled out by
          construction.
        </p>
        <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0" aria-label="Core loop">
          {loop.map((step, index) => (
            <li key={step} className="flex items-center gap-2 text-sm text-secondary">
              {index > 0 ? <span aria-hidden="true">→</span> : null}
              <span className="rounded-pill border border-border px-3 py-1 text-foreground">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="grid gap-4 p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="m-0 text-xl font-semibold text-foreground">Stocks</h2>
          <form action="/stocks" className="flex flex-wrap items-end gap-2" role="search">
            <label className="sr-only" htmlFor="today-search">
              Ticker or company name
            </label>
            <Input id="today-search" name="q" type="search" placeholder="NVDA, Apple…" />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </div>
        {symbols.length > 0 ? (
          <SymbolTable symbols={symbols} caption="Loaded symbols with their last close" />
        ) : (
          <EmptyState
            title="No symbols loaded yet"
            description="Daily candles arrive with the bootstrap: pnpm --filter @astraq/api bootstrap."
          />
        )}
      </Card>
    </main>
  );
}
