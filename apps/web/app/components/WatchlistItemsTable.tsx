"use client";

import { useId, useOptimistic, useTransition } from "react";
import type { Route } from "next";
import Link from "next/link";
import { BarChart3, GripVertical, X } from "lucide-react";
import {
  IconButton,
  Table,
  TableCaption,
  TableWrap,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  cn,
  useToastManager,
} from "@astraq/ui";
import { removeSymbol, reorderWatchlist } from "@/app/(app)/watchlists/actions";
import { useReorder } from "@/lib/use-reorder";
import type { WatchlistItem } from "@/lib/watchlists";
import { QuoteCells } from "./QuoteCells";

type Change =
  | { kind: "remove"; ticker: string }
  | { kind: "order"; tickers: string[] };

/** The list after one change, for the optimistic copy; the api does the same. */
function apply(items: WatchlistItem[], change: Change): WatchlistItem[] {
  if (change.kind === "remove") {
    return items.filter((item) => item.ticker !== change.ticker);
  }
  const byTicker = new Map(items.map((item) => [item.ticker, item]));
  const ordered = change.tickers.flatMap((ticker) => {
    const item = byTicker.get(ticker);
    return item ? [item] : [];
  });
  return ordered.length === items.length ? ordered : items;
}

/**
 * The rows of one watchlist. Removing and reordering show at once through
 * `useOptimistic` and settle when the server action's revalidation brings
 * the real list; a failure snaps back and says why in a toast.
 *
 * Reordering (motion plan "Drag to reorder") is `useReorder`: the grip
 * drags with the pointer or lifts with the keyboard, and either way it ends
 * in one reorder call with the whole order.
 */
export function WatchlistItemsTable({
  watchlistId,
  items,
}: {
  watchlistId: string;
  items: WatchlistItem[];
}) {
  const toast = useToastManager();
  const [, startTransition] = useTransition();
  const [visible, applyChange] = useOptimistic(items, apply);
  const instructionsId = useId();

  function fail(error: string) {
    toast.add({ title: error, type: "danger", priority: "high" });
  }

  const currentOrder = visible.map((item) => item.ticker);
  const reorder = useReorder<HTMLTableSectionElement>({
    order: currentOrder,
    onCommit: (order) => {
      startTransition(async () => {
        applyChange({ kind: "order", tickers: order });
        const result = await reorderWatchlist(watchlistId, order);
        if (!result.ok) fail(result.error);
      });
    },
  });
  const byTicker = new Map(visible.map((item) => [item.ticker, item]));
  const rows = reorder.order.flatMap((ticker) => {
    const item = byTicker.get(ticker);
    return item ? [item] : [];
  });

  function remove(ticker: string) {
    const order = currentOrder;
    startTransition(async () => {
      applyChange({ kind: "remove", ticker });
      const result = await removeSymbol(watchlistId, ticker);
      if (!result.ok) {
        fail(result.error);
        return;
      }
      const toastId = toast.add({
        title: `Removed ${ticker}`,
        timeout: 8000,
        actionProps: {
          children: "Undo",
          onClick: () => {
            toast.close(toastId);
            startTransition(async () => {
              const restored = await reorderWatchlist(watchlistId, order, {
                restore: ticker,
              });
              if (!restored.ok) fail(restored.error);
            });
          },
        },
      });
    });
  }

  return (
    <TableWrap>
      <p id={instructionsId} className="sr-only">
        Press Space to lift a row, the arrow keys to move it, Space again to
        drop it, and Escape to put it back.
      </p>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {reorder.announcement}
      </div>
      <Table>
        <TableCaption className="sr-only">
          Symbols on this watchlist, in your order
        </TableCaption>
        <Thead>
          <Tr>
            <Th>
              <span className="sr-only">Reorder</span>
            </Th>
            <Th>Ticker</Th>
            <Th>Name</Th>
            <Th className="text-right">Last close</Th>
            <Th>Day change</Th>
            <Th>Last 30 sessions</Th>
            <Th>As of</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </Tr>
        </Thead>
        <Tbody {...reorder.bodyProps}>
          {rows.map((item) => {
            const dragging = reorder.draggingId === item.ticker;
            return (
              <Tr
                key={item.ticker}
                ref={reorder.rowRef(item.ticker)}
                data-dragging={dragging || undefined}
                className={cn(
                  dragging &&
                    "relative z-10 bg-brand/10 shadow-soft outline-2 outline-offset-[-2px] outline-focus-ring"
                )}
              >
                <Td className="w-10 pr-0">
                  <button
                    type="button"
                    aria-label={`Reorder ${item.ticker}`}
                    aria-describedby={instructionsId}
                    {...reorder.gripProps(item.ticker)}
                    className={cn(
                      "inline-flex size-8 cursor-grab touch-none items-center justify-center rounded-md text-muted",
                      "hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                      dragging && "cursor-grabbing text-foreground"
                    )}
                  >
                    <GripVertical aria-hidden="true" className="size-4" />
                  </button>
                </Td>
                <Td>
                  <Link
                    href={`/stocks/${item.ticker}`}
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    {item.ticker}
                  </Link>
                </Td>
                <Td>
                  {item.name}
                  <span className="ml-2 text-xs text-muted">
                    {item.exchange}
                  </span>
                </Td>
                <QuoteCells
                  ticker={item.ticker}
                  latestClose={item.latestClose}
                  sparkline={item.sparkline}
                  showDate
                />
                <Td className="text-right">
                  <div className="inline-flex items-center gap-0.5">
                    <Link
                      href={`/analysis/returns?symbol=${item.ticker}` as Route}
                      aria-label={`${item.ticker} returns distribution`}
                      title="Returns distribution"
                      className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:text-foreground"
                    >
                      <BarChart3 aria-hidden="true" className="size-4" />
                    </Link>
                    <IconButton
                      label={`Remove ${item.ticker}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(item.ticker)}
                    >
                      <X aria-hidden="true" />
                    </IconButton>
                  </div>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </TableWrap>
  );
}
