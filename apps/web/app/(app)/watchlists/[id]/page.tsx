import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WatchlistIdParamSchema } from "@astraq/shared";
import { Card, EmptyState } from "@astraq/ui";
import { AddSymbolForm } from "@/app/components/AddSymbolForm";
import { WatchlistItemsTable } from "@/app/components/WatchlistItemsTable";
import { WatchlistMenu } from "@/app/components/WatchlistMenu";
import { getWatchlist } from "@/lib/watchlists";

type WatchlistPageProps = {
  params: Promise<{ id: string }>;
};

/** The list, or a 404 for a malformed id as well as a foreign one. */
async function load(params: WatchlistPageProps["params"]) {
  const parsed = WatchlistIdParamSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const watchlist = await getWatchlist(parsed.data.id);
  if (!watchlist) notFound();
  return watchlist;
}

export async function generateMetadata({
  params,
}: WatchlistPageProps): Promise<Metadata> {
  const watchlist = await load(params);
  return { title: watchlist.name };
}

// One watchlist (docs/ui-plan.md § Watchlists): a row per symbol with its
// last close, day change, and sparkline from stored candles. The server
// renders the rows; the table is a client component only for the
// optimistic remove and reorder.
export default async function WatchlistPage({ params }: WatchlistPageProps) {
  const watchlist = await load(params);
  const count = watchlist.items.length;

  return (
    <main className="grid gap-5">
      <Card className="grid gap-3 p-7">
        <p className="m-0 text-sm text-muted">
          <Link
            href="/watchlists"
            className="underline-offset-4 hover:underline"
          >
            Watchlists
          </Link>
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="m-0 font-display text-4xl font-bold tracking-tight text-foreground">
              {watchlist.name}
            </h1>
            <p className="m-0 text-secondary tabular-nums">
              {count === 1 ? "1 symbol" : `${count} symbols`}
            </p>
          </div>
          <WatchlistMenu
            id={watchlist.id}
            name={watchlist.name}
            afterDelete="index"
          />
        </div>
      </Card>

      <Card className="grid gap-4 p-5 sm:p-7">
        <AddSymbolForm
          watchlistId={watchlist.id}
          watchlistName={watchlist.name}
        />
        {count > 0 ? (
          <WatchlistItemsTable
            watchlistId={watchlist.id}
            items={watchlist.items}
          />
        ) : (
          <EmptyState
            title="Nothing on this list yet"
            description="Add a symbol above by ticker or company name. Any listed US equity works; its history loads when you add it."
            action={
              <Link href="/stocks" className="text-brand-strong-fg underline">
                Browse stocks
              </Link>
            }
          />
        )}
      </Card>
    </main>
  );
}
