"use client";

import {
  useId,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
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
import {
  dropIndex,
  moveItem,
  reorderAnnouncement,
  stepIndex,
} from "@/lib/reorder";
import { sessionChange } from "@/lib/stock-chart";
import type { WatchlistItem } from "@/lib/watchlists";
import { DayChange } from "./DayChange";
import { Sparkline } from "./Sparkline";

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

/** A row being moved: by the pointer, or lifted with the keyboard. */
type Drag = {
  ticker: string;
  /** The preview order, shown while the drag lasts. */
  order: string[];
  mode: "pointer" | "keyboard";
};

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return (
    a.length === b.length && a.every((ticker, index) => ticker === b[index])
  );
}

/**
 * The rows of one watchlist. Removing and reordering show at once through
 * `useOptimistic` and settle when the server action's revalidation brings
 * the real list; a failure snaps back and says why in a toast.
 *
 * Reordering (motion plan "Drag to reorder"): the grip drags with the
 * pointer, the rows making way as it passes their midpoints; with the
 * keyboard, Space lifts the row, the arrows move it, Space drops it, and
 * Escape puts it back, each step read out by a live region. Both end in
 * the same `commit`, one reorder call with the whole order.
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
  const [drag, setDrag] = useState<Drag | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());
  const instructionsId = useId();

  function fail(error: string) {
    toast.add({ title: error, type: "danger", priority: "high" });
  }

  const currentOrder = visible.map((item) => item.ticker);
  const rows = drag
    ? drag.order.flatMap((ticker) => {
        const item = visible.find((row) => row.ticker === ticker);
        return item ? [item] : [];
      })
    : visible;

  function commit(order: string[]) {
    if (sameOrder(order, currentOrder)) return;
    startTransition(async () => {
      applyChange({ kind: "order", tickers: order });
      const result = await reorderWatchlist(watchlistId, order);
      if (!result.ok) fail(result.error);
    });
  }

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

  // Pointer drag: the grip captures the pointer, so moves keep arriving
  // wherever it goes; the row under the pointer is found from the rows'
  // on-screen midpoints in their preview order.
  function onPointerDown(
    event: PointerEvent<HTMLButtonElement>,
    ticker: string
  ) {
    if (event.button !== 0 || drag) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ ticker, order: currentOrder, mode: "pointer" });
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!drag || drag.mode !== "pointer") return;
    const midpoints = drag.order.map((ticker) => {
      const rect = rowRefs.current.get(ticker)?.getBoundingClientRect();
      return rect ? rect.top + rect.height / 2 : Number.NaN;
    });
    const from = drag.order.indexOf(drag.ticker);
    const to = dropIndex(midpoints, from, event.clientY);
    if (to !== from)
      setDrag({ ...drag, order: moveItem(drag.order, from, to) });
  }

  function onPointerUp() {
    if (!drag || drag.mode !== "pointer") return;
    setDrag(null);
    commit(drag.order);
  }

  function onPointerCancel() {
    if (drag?.mode === "pointer") setDrag(null);
  }

  // Keyboard: Space lifts and drops, arrows move the lifted row, Escape
  // cancels, and losing focus while lifted cancels too.
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, ticker: string) {
    const count = visible.length;
    const lifted = drag?.mode === "keyboard" && drag.ticker === ticker;

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (!lifted) {
        setDrag({ ticker, order: currentOrder, mode: "keyboard" });
        setAnnouncement(
          reorderAnnouncement({
            kind: "lift",
            label: ticker,
            position: currentOrder.indexOf(ticker) + 1,
            count,
          })
        );
        return;
      }
      setDrag(null);
      setAnnouncement(
        reorderAnnouncement({
          kind: "drop",
          label: ticker,
          position: drag.order.indexOf(ticker) + 1,
          count,
        })
      );
      commit(drag.order);
      return;
    }

    if (!lifted) return;

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const from = drag.order.indexOf(ticker);
      const to = stepIndex(from, event.key === "ArrowUp" ? -1 : 1, count);
      if (to === from) return;
      setDrag({ ...drag, order: moveItem(drag.order, from, to) });
      setAnnouncement(
        reorderAnnouncement({
          kind: "move",
          label: ticker,
          position: to + 1,
          count,
        })
      );
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setDrag(null);
      setAnnouncement(reorderAnnouncement({ kind: "cancel", label: ticker }));
    }
  }

  function onBlur(ticker: string) {
    if (drag?.mode === "keyboard" && drag.ticker === ticker) {
      setDrag(null);
      setAnnouncement(reorderAnnouncement({ kind: "cancel", label: ticker }));
    }
  }

  return (
    <TableWrap>
      <p id={instructionsId} className="sr-only">
        Press Space to lift a row, the arrow keys to move it, Space again to
        drop it, and Escape to put it back.
      </p>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
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
        <Tbody>
          {rows.map((item) => {
            const session = item.latestClose
              ? sessionChange(item.latestClose)
              : null;
            const dragging = drag?.ticker === item.ticker;
            return (
              <Tr
                key={item.ticker}
                ref={(node) => {
                  if (node) rowRefs.current.set(item.ticker, node);
                  else rowRefs.current.delete(item.ticker);
                }}
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
                    aria-pressed={
                      drag?.mode === "keyboard" && dragging ? true : undefined
                    }
                    onPointerDown={(event) => onPointerDown(event, item.ticker)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerCancel}
                    onLostPointerCapture={onPointerCancel}
                    onKeyDown={(event) => onKeyDown(event, item.ticker)}
                    onBlur={() => onBlur(item.ticker)}
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
