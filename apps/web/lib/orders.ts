import { formatPrice, formatShares } from "./format";
import type { Order, OrderPreview } from "./portfolios";

// How an order reads on screen: in the ticket's preview, the Orders tab,
// and the toasts. Pure, so the three can't drift apart in wording.

const weekday = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: "UTC",
});

const monthDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** A session date (YYYY-MM-DD) as "Nov 18". Sessions are calendar days, so UTC keeps the day. */
export const formatSession = (date: string) => monthDay.format(new Date(date));

/** "Buy 10 NVDA" / "Sell 2.5 AAPL at 150.10 or better". */
export function orderLine(
  order: Pick<Order, "side" | "type" | "quantity" | "ticker" | "limitPrice">
): string {
  const line = `${order.side === "buy" ? "Buy" : "Sell"} ${formatShares(order.quantity)} ${order.ticker}`;
  return order.type === "limit" && order.limitPrice
    ? `${line} at ${formatPrice(order.limitPrice)} or better`
    : line;
}

/**
 * When an order would fill, from the api's preview (the shared fill model,
 * ADR 0008): at once, at the next session's open, or once a session trades
 * through its limit.
 */
export function fillTiming(
  preview: Pick<OrderPreview, "timing" | "fillSession" | "priceDate">,
  type: Order["type"]
): string {
  const session = new Date(preview.fillSession);
  const day = `${weekday.format(session)}, ${monthDay.format(session)}`;
  if (preview.timing === "immediate") {
    return preview.priceDate
      ? `Fills now, at the close of ${formatSession(preview.priceDate)}`
      : "Fills now, at the latest close";
  }
  return type === "market"
    ? `Market closed. Fills at the open on ${day}`
    : `Waits for a session that trades through the limit, from ${day}`;
}

const CLOSE_REASONS: Record<NonNullable<Order["closeReason"]>, string> = {
  user: "Cancelled by you",
  split: "Cancelled: the symbol split while it waited",
  insufficient_cash: "Rejected at the fill: not enough cash",
  insufficient_shares: "Rejected at the fill: not enough shares",
  too_small: "Rejected: the fill came to less than a cent",
};

/** Why an order ended without a fill; null while it is open or once it has filled. */
export const closeReasonText = (order: Pick<Order, "closeReason">) =>
  order.closeReason ? CLOSE_REASONS[order.closeReason] : null;

const FILL_RULES: Record<NonNullable<Order["fill"]>["rule"], string> = {
  market_open: "at the open",
  market_last: "at the latest close",
  limit_open: "at the open, past the limit",
  limit_cross: "at the limit",
};

/** Which rule of the fill model priced a fill, in words. */
export const fillRuleText = (fill: NonNullable<Order["fill"]>) =>
  FILL_RULES[fill.rule];

/** What a just-placed order's toast says: a title, and the tone it is said in. */
export function placedMessage(order: Order): {
  title: string;
  description?: string;
  type: "success" | "info" | "danger";
} {
  const line = orderLine(order);
  if (order.status === "filled" && order.fill) {
    return {
      title: `${order.side === "buy" ? "Bought" : "Sold"} ${formatShares(order.quantity)} ${order.ticker} at ${formatPrice(order.fill.price)}`,
      type: "success",
    };
  }
  if (order.status === "rejected") {
    return {
      title: `${line}: rejected`,
      description: closeReasonText(order) ?? undefined,
      type: "danger",
    };
  }
  return {
    title: `Order placed: ${line}`,
    description: "It is on the Orders tab until it fills.",
    type: "info",
  };
}
