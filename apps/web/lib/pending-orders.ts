"use client";

import { useMemo, useSyncExternalStore } from "react";

// Orders the ticket has sent and the api hasn't answered yet. The ticket is
// a drawer that opens from several places and the Orders tab is a table
// somewhere else on the page, so they share this small store instead of a
// provider: the ticket adds an order when it is submitted and takes it out
// when the answer arrives, and the table shows what's here above the
// server's list (docs/ui-plan.md § Order ticket: "appears optimistically").
// In memory only: a reload shows the server's truth.

export type PendingOrder = {
  /** The placement's idempotency key: unique per ticket. */
  key: string;
  portfolioId: string;
  ticker: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  /** Null for an order asked for in dollars: the api hasn't sized it yet. */
  quantity: string | null;
  /** The dollar amount asked for instead of shares, or null. */
  amount: string | null;
  limitPrice: string | null;
};

const NONE: readonly PendingOrder[] = [];
let pending: readonly PendingOrder[] = NONE;
const listeners = new Set<() => void>();

function set(next: readonly PendingOrder[]) {
  pending = next;
  for (const listener of listeners) listener();
}

export function addPendingOrder(order: PendingOrder) {
  set([order, ...pending.filter((other) => other.key !== order.key)]);
}

export function removePendingOrder(key: string) {
  set(pending.filter((order) => order.key !== key));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The portfolio's orders still on their way to the api, newest first. */
export function usePendingOrders(portfolioId: string): PendingOrder[] {
  const all = useSyncExternalStore(
    subscribe,
    () => pending,
    () => NONE
  );
  return useMemo(
    () => all.filter((order) => order.portfolioId === portfolioId),
    [all, portfolioId]
  );
}
