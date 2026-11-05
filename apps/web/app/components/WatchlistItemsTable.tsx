"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, X } from "lucide-react";
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
  useToastManager,
} from "@astraq/ui";
import { removeSymbol, reorderWatchlist } from "@/app/(app)/watchlists/actions";
import { sessionChange } from "@/lib/stock-chart";
import type { WatchlistItem } from "@/lib/watchlists";
import { DayChange } from "./DayChange";
import { Sparkline } from "./Sparkline";

type Change =
  | { kind: "remove"; ticker: string }
  | { kind: "move"; ticker: string; by: -1 | 1 };

/** The list after one change, for the optimistic copy; the api does the same. */
function apply(items: WatchlistItem[], change: Change): WatchlistItem[] {
  const index = items.findIndex((item) => item.ticker === change.ticker);
  if (index === -1) return items;
  if (change.kind === "remove") return items.toSpliced(index, 1);
  const target = index + change.by;
  if (target < 0 || target >= items.length) return items;
  const next = items.slice();
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

/**
 * The rows of one watchlist. Removing and reordering show at once through
 * `useOptimistic` and settle when the server action's revalidation brings
 * the real list; a failure snaps back and says why in a toast. Reordering
 * is by the row's arrows (keyboard-friendly); drag comes with the motion
 * plan's Phase 2 row.
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

  function fail(error: string) {
    toast.add({ title: error, type: "danger", priority: "high" });
  }

  function move(ticker: string, by: -1 | 1) {
    const order = apply(visible, { kind: "move", ticker, by }).map(
      (item) => item.ticker
    );
    startTransition(async () => {
      applyChange({ kind: "move", ticker, by });
      const result = await reorderWatchlist(watchlistId, order);
      if (!result.ok) fail(result.error);
    });
  }

  function remove(ticker: string) {
    const order = visible.map((item) => item.ticker);
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
      <Table>
        <TableCaption className="sr-only">
          Symbols on this watchlist, in your order
        </TableCaption>
        <Thead>
          <Tr>
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
        <Tbody>
          {visible.map((item, index) => {
            const session = item.latestClose
              ? sessionChange(item.latestClose)
              : null;
            return (
              <Tr key={item.ticker}>
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
                {session ? (
                  <>
                    <Td className="text-right tabular-nums">{session.close}</Td>
                    <Td className="tabular-nums">
                      <DayChange session={session} />
                    </Td>
                    <Td>
                      <Sparkline ticker={item.ticker} points={item.sparkline} />
                    </Td>
                    <Td className="text-sm text-muted">
                      <time dateTime={session.date}>{session.date}</time>
                    </Td>
                  </>
                ) : (
                  <Td colSpan={4} className="text-sm text-muted">
                    No candles yet
                  </Td>
                )}
                <Td className="text-right">
                  <div className="inline-flex items-center gap-0.5">
                    <IconButton
                      label={`Move ${item.ticker} up`}
                      variant="ghost"
                      size="sm"
                      aria-disabled={index === 0 || undefined}
                      onClick={() => move(item.ticker, -1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={`Move ${item.ticker} down`}
                      variant="ghost"
                      size="sm"
                      aria-disabled={index === visible.length - 1 || undefined}
                      onClick={() => move(item.ticker, 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </IconButton>
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
