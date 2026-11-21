import type { Route } from "next";
import Link from "next/link";
import { Card, Stat } from "@astraq/ui";
import { formatMoney, formatSignedMoney, signedPercent } from "@/lib/format";
import { cashDirection } from "@/lib/money";
import { formatSession } from "@/lib/orders";
import { totalReturn, type PortfolioOverview } from "@/lib/portfolios";

/**
 * One paper portfolio on Today (docs/ui-plan.md § Today, Phase 3): what it
 * is worth, what the last day did to it, its cash, and the orders still
 * waiting. Read only; the heading opens the portfolio's own page.
 */
export function PortfolioSummaryCard({
  overview: { portfolio, day, openOrders },
}: {
  overview: PortfolioOverview;
}) {
  const made = totalReturn(portfolio);
  const held = portfolio.positions.length;

  return (
    <Card className="grid gap-5 p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 text-xl font-semibold text-foreground">
          <Link
            href={`/portfolios/${portfolio.id}`}
            className="underline-offset-4 hover:underline"
          >
            {portfolio.name}
          </Link>
        </h2>
        <p className="m-0 text-sm text-muted">
          Paper portfolio · {held} {held === 1 ? "position" : "positions"}
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-x-8 gap-y-5">
        <Stat
          label="Equity"
          value={
            portfolio.equity === null ? "—" : formatMoney(portfolio.equity)
          }
          delta={
            made
              ? made.ratio === null
                ? formatSignedMoney(made.amount)
                : `${formatSignedMoney(made.amount)} (${signedPercent.format(made.ratio)})`
              : undefined
          }
          {...(made ? cashDirection(made.amount) : {})}
          description={
            portfolio.equity === null
              ? "A position has no price yet"
              : "Total return beside it"
          }
        />
        <Stat
          label="Day PnL"
          value={day ? formatSignedMoney(day.amount) : "—"}
          {...(day ? cashDirection(day.amount) : {})}
          description={
            day
              ? `On ${formatSession(day.date)}`
              : "Once every position has a close"
          }
        />
        <Stat label="Cash" value={formatMoney(portfolio.cash)} />
        <Stat
          label="Open orders"
          value={String(openOrders)}
          description={
            <Link
              href={`/portfolios/${portfolio.id}/orders` as Route}
              className="underline underline-offset-4"
            >
              {openOrders > 0 ? "Waiting for a session" : "All orders"}
            </Link>
          }
        />
      </div>
    </Card>
  );
}
