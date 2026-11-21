import Link from "next/link";
import { Card, Stat } from "@astraq/ui";
import {
  formatCostPerShare,
  formatMoney,
  formatShares,
  formatSignedMoney,
  signedPercent,
} from "@/lib/format";
import { cashDirection, cashRatio } from "@/lib/money";
import { formatSession } from "@/lib/orders";
import type { SymbolHolding } from "@/lib/portfolios";

/**
 * What the user holds of the stock page's symbol (docs/ui-plan.md § Stock
 * page, Phase 3): shares, average cost, and unrealized PnL at the latest
 * close, once per portfolio that holds it. The page renders it only when
 * one does.
 */
export function PositionSummary({
  ticker,
  holdings,
}: {
  ticker: string;
  holdings: SymbolHolding[];
}) {
  return (
    <Card className="grid gap-5 p-7">
      <h2 className="m-0 font-display text-xl font-bold tracking-tight text-foreground">
        Your position
      </h2>
      {holdings.map(({ portfolio, position }) => {
        const gain =
          position.unrealizedPnl === null
            ? null
            : cashRatio(position.unrealizedPnl, position.cost);
        return (
          <section
            key={portfolio.id}
            className="grid gap-3"
            aria-label={`${ticker} in ${portfolio.name}`}
          >
            <p className="m-0 text-sm text-secondary">
              In{" "}
              <Link
                href={`/portfolios/${portfolio.id}`}
                className="font-semibold text-foreground underline underline-offset-4"
              >
                {portfolio.name}
              </Link>
            </p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-x-8 gap-y-5">
              <Stat label="Shares" value={formatShares(position.quantity)} />
              <Stat
                label="Average cost"
                value={
                  formatCostPerShare(position.cost, position.quantity) ?? "—"
                }
                description={`${formatMoney(position.cost)} in all`}
              />
              <Stat
                label="Market value"
                value={
                  position.marketValue === null
                    ? "—"
                    : formatMoney(position.marketValue)
                }
                description={
                  position.priceDate === null
                    ? "No close stored yet"
                    : `At the close of ${formatSession(position.priceDate)}`
                }
              />
              <Stat
                label="Unrealized PnL"
                value={
                  position.unrealizedPnl === null
                    ? "—"
                    : formatSignedMoney(position.unrealizedPnl)
                }
                delta={gain === null ? undefined : signedPercent.format(gain)}
                {...(position.unrealizedPnl === null
                  ? {}
                  : cashDirection(position.unrealizedPnl))}
                description="Against what the shares cost"
              />
            </div>
          </section>
        );
      })}
    </Card>
  );
}
