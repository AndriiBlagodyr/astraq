import Link from "next/link";
import { Card, buttonVariants } from "@astraq/ui";

// Phase 0 has no market data yet, so Today is a short text page. Phase 1
// replaces it with symbol search and the bootstrapped tickers
// (docs/ui-plan.md § Today). No mock charts or sample numbers.

const loop = ["Watchlist", "Chart", "Strategy", "Honest backtest", "Paper trade", "Review"];

export default function TodayPage() {
  return (
    <main className="grid gap-5">
      <Card className="grid gap-5 p-7">
        <h1 className="m-0 font-display text-4xl font-bold tracking-tight text-foreground">
          Forelume
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

      <Card className="grid gap-3 p-7">
        <h2 className="m-0 text-xl font-semibold text-foreground">Nothing to show yet</h2>
        <p className="m-0 max-w-2xl leading-7 text-secondary">
          The foundation is being closed before any data flows. Daily candles for a first set of
          tickers come next, and this page will list them.
        </p>
        <div>
          <Link href="/status" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Check service status
          </Link>
        </div>
      </Card>
    </main>
  );
}
