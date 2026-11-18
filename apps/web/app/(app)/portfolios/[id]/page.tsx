import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortfolioIdParamSchema } from "@astraq/shared";
import { Card, EmptyState, Stat } from "@astraq/ui";
import { CashTransferForm } from "@/app/components/CashTransferForm";
import { HoldingsTable } from "@/app/components/HoldingsTable";
import {
  formatMoney,
  formatPrice,
  formatSignedMoney,
  signedPercent,
} from "@/lib/format";
import { cashSign } from "@/lib/money";
import {
  getPortfolio,
  pricedAsOf,
  totalReturn,
  type Portfolio,
} from "@/lib/portfolios";

type PortfolioPageProps = {
  params: Promise<{ id: string }>;
};

/** The portfolio, or a 404 for a malformed id as well as a foreign one. */
async function load(params: PortfolioPageProps["params"]) {
  const parsed = PortfolioIdParamSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const portfolio = await getPortfolio(parsed.data.id);
  if (!portfolio) notFound();
  return portfolio;
}

export async function generateMetadata({
  params,
}: PortfolioPageProps): Promise<Metadata> {
  const portfolio = await load(params);
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

/** The trading costs and limit the portfolio was created with, in one line. */
function costsLine(portfolio: Portfolio): string {
  const parts = [
    portfolio.slippageBps > 0
      ? `${portfolio.slippageBps} bps slippage`
      : "No slippage",
  ];
  const perOrder = Number(portfolio.commissionPerOrder) > 0;
  const perShare = Number(portfolio.commissionPerShare) > 0;
  if (perOrder || perShare) {
    const fees = [
      perOrder && `${formatMoney(portfolio.commissionPerOrder)} per order`,
      perShare && `${formatPrice(portfolio.commissionPerShare)} per share`,
    ].filter(Boolean);
    parts.push(`commission ${fees.join(" + ")}`);
  } else {
    parts.push("no commission");
  }
  parts.push(
    portfolio.maxOrderNotional === null
      ? "no order limit"
      : `orders up to ${formatMoney(portfolio.maxOrderNotional)}`
  );
  return parts.join(" · ");
}

// One portfolio's Holdings (docs/ui-plan.md § Portfolio): what it is worth,
// where that comes from, and each position at its latest close, with paper
// cash in and out. Reading the portfolio settles it, so the figures already
// include every fill, split, and dividend that has become due. The Orders
// and Activity tabs and the equity curve are later slices (ROADMAP Phase 3
// item 6); nothing here links to them until they exist.
export default async function PortfolioPage({ params }: PortfolioPageProps) {
  const portfolio = await load(params);
  const made = totalReturn(portfolio);
  const asOf = pricedAsOf(portfolio.positions);
  const receivable = cashSign(portfolio.dividendsReceivable) > 0;

  return (
    <main className="grid gap-5">
      <Card className="grid gap-3 p-7">
        <p className="m-0 text-sm text-muted">
          <Link
            href="/portfolios?all"
            className="underline-offset-4 hover:underline"
          >
            Portfolios
          </Link>
        </p>
        <h1 className="m-0 font-display text-4xl font-bold tracking-tight text-foreground">
          {portfolio.name}
        </h1>
        <p className="m-0 text-sm text-secondary">{costsLine(portfolio)}</p>
      </Card>

      <Card className="grid gap-6 p-7">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-x-8 gap-y-6">
          <Stat
            size="lg"
            className="col-span-full"
            label="Equity"
            value={portfolio.equity === null ? "—" : formatMoney(portfolio.equity)}
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
            description="Positions appear here once an order fills. The order ticket is the next piece of this page; until it lands, orders are placed through the api."
          />
        )}
      </Card>
    </main>
  );
}
