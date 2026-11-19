import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, EmptyState } from "@astraq/ui";
import { ActivityTable } from "@/app/components/ActivityTable";
import { PortfolioHeader } from "@/app/components/PortfolioHeader";
import {
  getPortfolio,
  listActivity,
  loadPortfolio,
  portfolioIdFrom,
} from "@/lib/portfolios";

type ActivityPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ActivityPageProps): Promise<Metadata> {
  const portfolio = await loadPortfolio(params);
  return { title: `Activity · ${portfolio.name}` };
}

// A portfolio's Activity tab (docs/ui-plan.md § Portfolio): its ledger as a
// timeline. Every figure on the Holdings tab is derived from these lines,
// and the newest line's "cash after" is the cash shown there.
export default async function ActivityPage({ params }: ActivityPageProps) {
  const id = await portfolioIdFrom(params);
  const [portfolio, activity] = await Promise.all([
    getPortfolio(id),
    listActivity(id),
  ]);
  if (!portfolio || !activity) notFound();

  return (
    <main className="grid gap-5">
      <PortfolioHeader portfolio={portfolio} tab="activity" />
      <Card className="grid gap-4 p-5 sm:p-7">
        <div className="grid gap-1">
          <h2 className="m-0 font-display text-xl font-bold tracking-tight text-foreground">
            Activity
          </h2>
          <p className="m-0 max-w-2xl text-sm leading-6 text-secondary">
            The ledger, newest first: every fill, cash move, split, and
            dividend. The top line&apos;s cash after is the cash on Holdings.
          </p>
        </div>
        {activity.length > 0 ? (
          <ActivityTable activity={activity} />
        ) : (
          <EmptyState
            title="Nothing has happened yet"
            description="A deposit or a filled order is the first line of this portfolio's history."
          />
        )}
      </Card>
    </main>
  );
}
