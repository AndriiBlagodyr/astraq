"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { Card } from "@astraq/ui";
import { createLocalStore } from "@/lib/local-store";
import {
  parseRecentStocks,
  rememberStock,
  type RecentStock,
} from "@/lib/recent-stocks";

// Recently viewed stocks (docs/ui-plan.md § Today, Phase 2). The list is
// this browser's own history, kept in localStorage like the palette's
// recent items and read the same way (lib/local-store.ts): through
// useSyncExternalStore, with an empty server snapshot, so the server's HTML
// and the first client render agree and the stored list appears right
// after hydration.

const store = createLocalStore("veracand-recent-stocks");

/** Renders nothing; a stock page mounts it to put itself on the list. */
export function RecordStockView({ ticker, name }: RecentStock) {
  useEffect(() => {
    store.write(
      rememberStock(parseRecentStocks(store.read()), { ticker, name })
    );
  }, [ticker, name]);
  return null;
}

/** Today's card of the stocks opened last; absent until there is one. */
export function RecentStocks() {
  const raw = useSyncExternalStore(
    store.subscribe,
    store.read,
    store.readOnServer
  );
  const stocks = useMemo(() => parseRecentStocks(raw), [raw]);
  if (stocks.length === 0) return null;

  return (
    <Card className="grid gap-4 p-7">
      <h2 className="m-0 text-xl font-semibold text-foreground">
        Recently viewed
      </h2>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {stocks.map((stock) => (
          <li key={stock.ticker}>
            <Link
              href={`/stocks/${stock.ticker}`}
              className="inline-flex min-h-9 items-baseline gap-2 rounded-pill border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"
            >
              <span className="font-semibold text-foreground">
                {stock.ticker}
              </span>
              {stock.name ? (
                <span className="max-w-48 truncate text-muted">
                  {stock.name}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
