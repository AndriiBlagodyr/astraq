import type { Metadata } from "next";
import { Card, EmptyState, Stat } from "@astraq/ui";
import { CashTransferForm } from "@/app/components/CashTransferForm";
import { HoldingsTable } from "@/app/components/HoldingsTable";
import { PortfolioHeader } from "@/app/components/PortfolioHeader";
import { formatMoney, formatSignedMoney, signedPercent } from "@/lib/format";
import { cashSign } from "@/lib/money";
import { loadPortfolio, pricedAsOf, totalReturn } from "@/lib/portfolios";

type PortfolioPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PortfolioPageProps): Promise<Metadata> {
  const portfolio = await loadPortfolio(params);
  return { title: portfolio.name };
}

const sessionDay = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

/** Which way a signed figure points, as the Stat's arrow and color. */
function direction(value: string) {
  const sign = cashSign(value);
  return {
    trend: sign > 0 ? "up" : sign < 0 ? "down" : "flat",
    tone: sign > 0 ? "positive" : sign < 0 ? "negative" : "neutral",
  } as const;
}

// One portfolio's Holdings (docs/ui-plan.md § Portfolio): what it is worth,
// where that comes from, and each position at its latest close, with paper
// cash in and out. Reading the portfolio settles it, so the figures already
// include every fill, split, and dividend that has become due. Orders and
// Activity are the other two tabs; the equity curve is the last slice of
// ROADMAP Phase 3 item 6.
export default async function PortfolioPage({ params }: PortfolioPageProps) {
  const portfolio = await loadPortfolio(params);
  const made = totalReturn(portfolio);
  const asOf = pricedAsOf(portfolio.positions);
  const receivable = cashSign(portfolio.dividendsReceivable) > 0;

  return (
    <main className="grid gap-5">
      <PortfolioHeader portfolio={portfolio} tab="holdings" />

      <Card className="grid gap-6 p-7">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-x-8 gap-y-6">
          <Stat
            size="lg"
            className="col-span-full"
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
            {...(made ? direction(made.amount) : {})}
            description={
              portfolio.equity === null
                ? "A position has no price yet, so there is no total."
                : `Total return on ${formatMoney(portfolio.capital)} paid in. ` +
                  (asOf
                    ? `Prices as of the close on ${sessionDay.format(new Date(asOf))}.`
                    : "All of it is cash.")
            }
          />
          <Stat label="Cash" value={formatMoney(portfolio.cash)} />
          <Stat
            label="Market value"
            value={
              portfolio.marketValue === null
                ? "—"
                : formatMoney(portfolio.marketValue)
            }
            delta={
              portfolio.unrealizedPnl === null
                ? undefined
                : formatSignedMoney(portfolio.unrealizedPnl)
            }
            {...(portfolio.unrealizedPnl === null
              ? {}
              : direction(portfolio.unrealizedPnl))}
            description="Unrealized PnL beside it"
          />
          <Stat
            label="Realized PnL"
            value={formatSignedMoney(portfolio.realizedPnl)}
            description="On sold shares, FIFO, before fees"
          />
          <Stat
            label="Dividends"
            value={formatMoney(portfolio.dividendIncome)}
            description={
              receivable
                ? `${formatMoney(portfolio.dividendsReceivable)} not paid yet`
                : "Earned so far"
            }
          />
          <Stat
            label="Fees"
            value={formatMoney(portfolio.fees)}
            description="Commissions paid"
          />
        </div>
        <CashTransferForm portfolioId={portfolio.id} />
      </Card>

      <Card className="grid gap-4 p-5 sm:p-7">
        <h2 className="m-0 font-display text-xl font-bold tracking-tight text-foreground">
          Holdings
        </h2>
        {portfolio.positions.length > 0 ? (
          <HoldingsTable portfolio={portfolio} />
        ) : (
          <EmptyState
            title="Nothing held yet"
            description="Positions appear here once an order fills. Trade, at the top of this page, opens the order ticket."
          />
        )}
      </Card>
    </main>
  );
}
