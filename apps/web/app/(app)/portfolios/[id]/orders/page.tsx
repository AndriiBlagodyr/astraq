import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@astraq/ui";
import { OrdersTable } from "@/app/components/OrdersTable";
import { PortfolioHeader } from "@/app/components/PortfolioHeader";
import {
  getPortfolio,
  listOrders,
  loadPortfolio,
  portfolioIdFrom,
} from "@/lib/portfolios";

type OrdersPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: OrdersPageProps): Promise<Metadata> {
  const portfolio = await loadPortfolio(params);
  return { title: `Orders · ${portfolio.name}` };
}

// A portfolio's Orders tab (docs/ui-plan.md § Portfolio): every order with
// where it stands, how it filled or why it didn't, and Cancel on the ones
// still waiting. Listing the orders settles the portfolio first (the api
// does), so an order that met its bar since the last visit shows as filled.
export default async function OrdersPage({ params }: OrdersPageProps) {
  const id = await portfolioIdFrom(params);
  const [portfolio, orders] = await Promise.all([
    getPortfolio(id),
    listOrders(id),
  ]);
  if (!portfolio || !orders) notFound();

  return (
    <main className="grid gap-5">
      <PortfolioHeader portfolio={portfolio} tab="orders" />
      <Card className="grid gap-4 p-5 sm:p-7">
        <h2 className="m-0 font-display text-xl font-bold tracking-tight text-foreground">
          Orders
        </h2>
        <OrdersTable portfolioId={portfolio.id} orders={orders} />
      </Card>
    </main>
  );
}
