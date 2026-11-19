"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  EmptyState,
  Spinner,
  Table,
  TableCaption,
  TableWrap,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useToastManager,
  type BadgeProps,
} from "@astraq/ui";
import { cancelOrder } from "@/app/(app)/portfolios/actions";
import { formatMoney, formatPrice, formatShares } from "@/lib/format";
import {
  closeReasonText,
  fillRuleText,
  formatSession,
  orderLine,
} from "@/lib/orders";
import { usePendingOrders, type PendingOrder } from "@/lib/pending-orders";
import type { Order } from "@/lib/portfolios";
import { LocalTime } from "./LocalTime";

const dash = <span className="text-muted">—</span>;

// "Pending" is the plan's word for the api's `open` (docs/ui-plan.md).
const STATUS: Record<
  Order["status"],
  { label: string; tone: BadgeProps["tone"] }
> = {
  open: { label: "Pending", tone: "brand" },
  filled: { label: "Filled", tone: "positive" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  rejected: { label: "Rejected", tone: "negative" },
};

/** What was asked for: side, shares, symbol, and the limit if it has one. */
function Asked({
  order,
}: {
  order: Pick<Order, "side" | "type" | "quantity" | "ticker" | "limitPrice">;
}) {
  return (
    <>
      <span className="font-semibold text-foreground">
        {order.side === "buy" ? "Buy" : "Sell"} {formatShares(order.quantity)}{" "}
        <Link
          href={`/stocks/${order.ticker}`}
          className="underline-offset-4 hover:underline"
        >
          {order.ticker}
        </Link>
      </span>
      <span className="block text-sm text-muted">
        {order.type === "limit" && order.limitPrice
          ? `Limit ${formatPrice(order.limitPrice)}`
          : "Market"}
      </span>
    </>
  );
}

/** An order the ticket has sent and the api hasn't answered yet. */
function PendingRow({ order }: { order: PendingOrder }) {
  return (
    <Tr aria-busy="true">
      <Td className="text-sm text-muted">Just now</Td>
      <Td>
        <Asked order={order} />
      </Td>
      <Td>
        <Badge tone="neutral">
          <Spinner />
          Placing
        </Badge>
      </Td>
      <Td align="end">{dash}</Td>
      <Td align="end">{dash}</Td>
      <Td />
    </Tr>
  );
}

/**
 * A portfolio's orders, newest first (docs/ui-plan.md § Portfolio, Orders
 * tab): what was asked, where it stands, and how it filled or why it
 * didn't. An order the ticket has just sent shows at the top before the api
 * answers, and goes again if the api refuses it. Cancelling marks the row
 * at once through `useOptimistic`; the server's list then says what really
 * happened, which can be "it had already filled".
 */
export function OrdersTable({
  portfolioId,
  orders,
}: {
  portfolioId: string;
  orders: Order[];
}) {
  const toast = useToastManager();
  const pending = usePendingOrders(portfolioId);
  const [, startTransition] = useTransition();
  const [cancelling, markCancelling] = useOptimistic(
    [] as string[],
    (ids, id: string) => [...ids, id]
  );

  function cancel(order: Order) {
    startTransition(async () => {
      markCancelling(order.id);
      const result = await cancelOrder(portfolioId, order.id).catch(() => null);
      if (result?.ok) {
        toast.add({ title: `Cancelled: ${orderLine(order)}`, type: "success" });
      } else {
        toast.add({
          title: result?.error ?? "Couldn't cancel the order",
          type: "danger",
          priority: "high",
        });
      }
    });
  }

  if (orders.length === 0 && pending.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        description="Trade, at the top of this page, opens the order ticket. Every order placed in this portfolio is listed here with how it filled."
      />
    );
  }

  return (
    <TableWrap scroll>
      <Table>
        <TableCaption className="sr-only">
          Orders with their status and fills, newest first
        </TableCaption>
        <Thead>
          <Tr>
            <Th>Placed</Th>
            <Th>Order</Th>
            <Th>Status</Th>
            <Th align="end">Fill price</Th>
            <Th align="end">Amount</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {pending.map((order) => (
            <PendingRow key={order.key} order={order} />
          ))}
          {orders.map((order) => {
            const { fill } = order;
            const isCancelling = cancelling.includes(order.id);
            const status = STATUS[order.status];
            const reason = closeReasonText(order);
            return (
              <Tr key={order.id}>
                <Td className="text-sm text-muted">
                  <LocalTime value={order.placedAt} />
                </Td>
                <Td>
                  <Asked order={order} />
                </Td>
                <Td>
                  <Badge tone={isCancelling ? "neutral" : status.tone}>
                    {isCancelling ? "Cancelling" : status.label}
                  </Badge>
                  {fill ? (
                    <span className="mt-1 block text-sm text-muted">
                      {fillRuleText(fill)}, session of{" "}
                      <time dateTime={fill.sessionDate}>
                        {formatSession(fill.sessionDate)}
                      </time>
                    </span>
                  ) : reason ? (
                    <span className="mt-1 block text-sm text-muted">
                      {reason}
                    </span>
                  ) : order.status === "open" ? (
                    <span className="mt-1 block text-sm text-muted">
                      {order.type === "market"
                        ? "Fills at the next session's open"
                        : "Waits for a session that trades through the limit"}
                    </span>
                  ) : null}
                </Td>
                <Td align="end" className="tabular-nums">
                  {fill ? formatPrice(fill.price) : dash}
                </Td>
                <Td align="end" className="tabular-nums">
                  {fill ? (
                    <>
                      {formatMoney(fill.notional)}
                      {Number(fill.commission) > 0 ? (
                        <span className="block text-sm text-muted">
                          + {formatMoney(fill.commission)} commission
                        </span>
                      ) : null}
                    </>
                  ) : (
                    dash
                  )}
                </Td>
                <Td align="end">
                  {order.status === "open" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isCancelling}
                      aria-label={`Cancel: ${orderLine(order)}`}
                      onClick={() => cancel(order)}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </TableWrap>
  );
}
