import Link from "next/link";
import { Card, buttonVariants } from "@astraq/ui";

// A short text page until the Today table lands: the bootstrapped tickers
// with last close and day change (docs/ui-plan.md § Today). Until then it
// points at Stocks, the first page with real data. No mock charts or numbers.

const loop = ["Watchlist", "Chart", "Strategy", "Honest backtest", "Paper trade", "Review"];

export default function TodayPage() {
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

      <Card className="grid gap-3 p-7">
        <h2 className="m-0 text-xl font-semibold text-foreground">Daily candles are in</h2>
        <p className="m-0 max-w-2xl leading-7 text-secondary">
          A first set of US tickers has daily history since 2016, adjusted for splits. Search them
          and open a chart. This page will summarize them next.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/stocks" className={buttonVariants({ size: "sm" })}>
            Browse stocks
          </Link>
          <Link href="/status" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Check service status
          </Link>
        </div>
      </Card>
    </main>
  );
}
