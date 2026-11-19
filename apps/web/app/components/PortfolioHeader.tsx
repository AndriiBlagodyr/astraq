import type { Route } from "next";
import Link from "next/link";
import { Card } from "@astraq/ui";
import { formatMoney, formatPrice } from "@/lib/format";
import type { Portfolio } from "@/lib/portfolios";
import { OrderTicket } from "./OrderTicket";
import { PillLinks } from "./PillLinks";

export type PortfolioTab = "holdings" | "orders" | "activity";

const TABS: { key: PortfolioTab; text: string; path: string }[] = [
  { key: "holdings", text: "Holdings", path: "" },
  { key: "orders", text: "Orders", path: "/orders" },
  { key: "activity", text: "Activity", path: "/activity" },
];

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

/**
 * The top of every portfolio page (docs/ui-plan.md § Portfolio): its name
 * and costs, the tabs, and Trade, which opens the order ticket. Each tab is
 * a route, so the header is rendered by each page with the tab it is.
 */
export function PortfolioHeader({
  portfolio,
  tab,
}: {
  portfolio: Portfolio;
  tab: PortfolioTab;
}) {
  return (
    <Card className="grid gap-4 p-7">
      <p className="m-0 text-sm text-muted">
        <Link
          href="/portfolios?all"
          className="underline-offset-4 hover:underline"
        >
          Portfolios
        </Link>
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 font-display text-4xl font-bold tracking-tight text-foreground">
          {portfolio.name}
        </h1>
        <OrderTicket
          portfolios={[{ id: portfolio.id, name: portfolio.name }]}
        />
      </div>
      <p className="m-0 text-sm text-secondary">{costsLine(portfolio)}</p>
      <div className="flex">
        <PillLinks
          label="Portfolio sections"
          items={TABS.map(({ key, text, path }) => ({
            key,
            text,
            href: `/portfolios/${portfolio.id}${path}` as Route,
            current: key === tab,
          }))}
        />
      </div>
    </Card>
  );
}
