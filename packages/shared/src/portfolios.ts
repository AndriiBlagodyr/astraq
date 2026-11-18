import { z } from "zod";
import { TickerParamSchema } from "./market-data";
import {
  decimalString,
  oneLineName,
  signedDecimalString,
} from "./primitives";

// Paper portfolios and their orders (ROADMAP Phase 3). Every amount crosses
// the wire as a decimal string: money is never a float.

const isAboveZero = (value: string) => /[1-9]/.test(value);

/** Cash: up to 13 whole digits and 2 decimal places, zero or more. */
const cashString = z
  .string()
  .regex(/^\d{1,13}(\.\d{1,2})?$/, "A cash amount with at most 2 decimal places");
/** Cash that can't be zero. */
const positiveCashString = cashString.refine(isAboveZero, "Must be above zero");
/** A balance that can be negative: realized PnL, or capital once gains are withdrawn. */
const signedCashString = signedDecimalString;
/** A share count: up to 6 decimal places, above zero. */
const quantityString = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,6})?$/, "A share count with at most 6 decimal places")
  .refine(isAboveZero, "Must be above zero");
/** A price per share: up to 6 decimal places, above zero. */
const priceString = z
  .string()
  .regex(/^\d{1,10}(\.\d{1,6})?$/, "A price with at most 6 decimal places")
  .refine(isAboveZero, "Must be above zero");

/** A portfolio's name, trimmed; one line, up to 64 characters. */
const portfolioName = oneLineName(64);

/** Path of `/api/portfolios/{id}/...`. */
export const PortfolioIdParamSchema = z.object({
  id: z.uuid(),
});

/** Path of `/api/portfolios/{id}/orders/{orderId}/...`. */
export const PortfolioOrderParamSchema = PortfolioIdParamSchema.extend({
  orderId: z.uuid(),
});

/**
 * Body of `POST /api/portfolios`. The cost settings are the fill model's
 * (ADR 0008) and default to free trading without slippage.
 */
export const CreatePortfolioBodySchema = z
  .object({
    name: portfolioName,
    /** The opening deposit; "0" opens an empty portfolio. */
    startingCash: cashString,
    /** Slippage on market-priced fills, in basis points (1 bp = 0.01%). */
    slippageBps: z.int().min(0).max(1000).default(0),
    /** Charged once per filled order. */
    commissionPerOrder: cashString.default("0"),
    /** Charged per share filled, up to 6 decimal places. */
    commissionPerShare: z
      .string()
      .regex(/^\d{1,6}(\.\d{1,6})?$/)
      .default("0"),
    /**
     * The most one order may come to, before commission. An order over it
     * is refused when it is placed. Absent or null for no limit.
     */
    maxOrderNotional: positiveCashString.nullish(),
  })
  .meta({ id: "CreatePortfolioBody" });

/** Body of `POST /api/portfolios/{id}/transfers`: cash paid in or taken out. */
export const CashTransferBodySchema = z
  .object({
    type: z.enum(["deposit", "withdrawal"]),
    amount: positiveCashString,
  })
  .meta({ id: "CashTransferBody" });

export const OrderSideSchema = z.enum(["buy", "sell"]).meta({ id: "OrderSide" });
export const OrderTypeSchema = z
  .enum(["market", "limit"])
  .meta({ id: "OrderType" });

/**
 * - `open`: waiting for a session that fills it;
 * - `filled`: filled whole (there are no partial fills);
 * - `cancelled`: ended by its owner, or by a split of its symbol;
 * - `rejected`: it met a fill the portfolio couldn't take.
 */
export const OrderStatusSchema = z
  .enum(["open", "filled", "cancelled", "rejected"])
  .meta({ id: "OrderStatus" });

/**
 * Why an order ended without a fill:
 * - `user`: cancelled by its owner;
 * - `split`: cancelled because the symbol split while it waited, so its
 *   quantity and limit were in the old shares;
 * - `insufficient_cash`, `insufficient_shares`: rejected at the fill (no
 *   buying on credit, no short selling);
 * - `too_small`: rejected because the fill came to less than a cent.
 */
export const OrderCloseReasonSchema = z
  .enum(["user", "split", "insufficient_cash", "insufficient_shares", "too_small"])
  .meta({ id: "OrderCloseReason" });

/**
 * Which rule of the fill model priced a fill (ADR 0008):
 * - `market_open`: a market order at a session's open;
 * - `market_last`: a market order at the latest known price, mid-session;
 * - `limit_open`: a limit order the open had already passed;
 * - `limit_cross`: a limit order the session traded through.
 */
export const FillRuleSchema = z
  .enum(["market_open", "market_last", "limit_open", "limit_cross"])
  .meta({ id: "FillRule" });

/**
 * Body of `POST /api/portfolios/{id}/orders`. The request also carries an
 * `Idempotency-Key` header: sending the same key again returns the order
 * the first request placed.
 */
export const PlaceOrderBodySchema = z
  .object({
    ticker: TickerParamSchema.shape.ticker,
    side: OrderSideSchema,
    type: OrderTypeSchema,
    quantity: quantityString,
    /** Required for a limit order, absent or null for a market order. */
    limitPrice: priceString.nullish(),
  })
  .refine((order) => (order.type === "limit") === (order.limitPrice != null), {
    message: "A limit order needs a limit price, and a market order has none",
    path: ["limitPrice"],
  })
  .meta({ id: "PlaceOrderBody" });

/** The value of the `Idempotency-Key` header: 1 to 128 printable ASCII characters. */
export const IdempotencyKeySchema = z
  .string()
  .regex(/^[\x21-\x7e]{1,128}$/, "1 to 128 printable ASCII characters, no spaces");

/** A portfolio as the index lists it. */
export const PortfolioSummarySchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    slippageBps: z.int().nonnegative(),
    commissionPerOrder: decimalString,
    commissionPerShare: decimalString,
    /** The most one order may come to, before commission; null for no limit. */
    maxOrderNotional: decimalString.nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: "PortfolioSummary" });

/** Body of `GET /api/portfolios`, oldest first. */
export const PortfolioListSchema = z
  .object({
    portfolios: z.array(PortfolioSummarySchema),
  })
  .meta({ id: "PortfolioList" });

/**
 * Shares held in one symbol, summed over its lots, at cost and at the
 * symbol's latest stored close. The price fields are null for a symbol
 * with no bars.
 */
export const PositionSchema = z
  .object({
    ticker: z.string(),
    name: z.string(),
    quantity: decimalString,
    /** What the shares still held cost, in cents. */
    cost: decimalString,
    /** The latest close per share, in the shares that trade today. */
    lastPrice: decimalString.nullable(),
    /** The session `lastPrice` is from, YYYY-MM-DD. */
    priceDate: z.iso.date().nullable(),
    /** `quantity × lastPrice`, in cents. */
    marketValue: decimalString.nullable(),
    /** `marketValue - cost`. */
    unrealizedPnl: signedCashString.nullable(),
  })
  .meta({ id: "Position" });

/**
 * A portfolio with its books, all derived from its ledger (ADR 0009):
 * `cash + cost of positions + dividendsReceivable` always equals
 * `capital + realizedPnl + dividendIncome - fees`.
 *
 * `marketValue`, `unrealizedPnl`, and `equity` price the positions at their
 * latest closes instead. They are null when a position has no price, since
 * a total that leaves one out would read as the whole.
 */
export const PortfolioSchema = PortfolioSummarySchema.extend({
  cash: decimalString,
  /** Paid in by the owner, less withdrawals: negative once more is taken out than was put in. */
  capital: signedCashString,
  /** Commissions paid. */
  fees: decimalString,
  /** Gains less losses on sold shares (FIFO), before fees. */
  realizedPnl: signedCashString,
  /** Dividends earned, paid or not. */
  dividendIncome: decimalString,
  /** Dividends that have gone ex and aren't paid yet. */
  dividendsReceivable: decimalString,
  /** The positions at their latest closes, in cents. */
  marketValue: decimalString.nullable(),
  /** `marketValue` less what the positions cost. */
  unrealizedPnl: signedCashString.nullable(),
  /** `cash + dividendsReceivable + marketValue`: what the portfolio is worth. */
  equity: decimalString.nullable(),
  /** By ticker. */
  positions: z.array(PositionSchema),
}).meta({ id: "Portfolio" });

/** How an order filled. */
export const OrderFillSchema = z
  .object({
    rule: FillRuleSchema,
    /** Per share. */
    price: decimalString,
    /** `quantity × price` in cents, without the commission. */
    notional: decimalString,
    commission: decimalString,
    /** The session whose prices filled the order, YYYY-MM-DD. */
    sessionDate: z.iso.date(),
    filledAt: z.iso.datetime(),
  })
  .meta({ id: "OrderFill" });

/** An order and where it stands. */
export const OrderSchema = z
  .object({
    id: z.uuid(),
    ticker: z.string(),
    side: OrderSideSchema,
    type: OrderTypeSchema,
    quantity: decimalString,
    /** Null on a market order. */
    limitPrice: decimalString.nullable(),
    status: OrderStatusSchema,
    /** Set on a cancelled or rejected order. */
    closeReason: OrderCloseReasonSchema.nullable(),
    placedAt: z.iso.datetime(),
    /** When it filled, was cancelled, or was rejected; null while open. */
    closedAt: z.iso.datetime().nullable(),
    /** Set on a filled order. */
    fill: OrderFillSchema.nullable(),
  })
  .meta({ id: "Order" });

/**
 * Why an order is refused when it is placed (a 422), before it exists:
 * - `insufficient_cash`: a buy the free cash doesn't cover, at the latest
 *   close or the limit, after what open buy orders are expected to take;
 * - `insufficient_shares`: a sell of more shares than are held and not
 *   already promised to open sell orders (no short selling);
 * - `max_notional`: over the portfolio's `maxOrderNotional`.
 */
export const OrderRefusalCodeSchema = z
  .enum(["insufficient_cash", "insufficient_shares", "max_notional"])
  .meta({ id: "OrderRefusalCode" });

/**
 * Body of `POST /api/portfolios/{id}/orders/preview`: what placing the
 * order now would do, without placing it. The amounts are estimates: a
 * market order is priced at the latest close with the portfolio's slippage
 * and a limit order at its limit, and the fill may differ.
 */
export const OrderPreviewSchema = z
  .object({
    /**
     * `immediate`: a market order while the market trades, filled on
     * placement. `next_session`: the order waits for `fillSession`.
     */
    timing: z.enum(["immediate", "next_session"]),
    /**
     * Today's session for `immediate`; otherwise the first session the
     * order can fill in, at its open for a market order. YYYY-MM-DD.
     */
    fillSession: z.iso.date(),
    /** Per share. Null for a market order on a symbol without a price. */
    estimatedPrice: decimalString.nullable(),
    /** The session the latest close is from; null on a limit order. */
    priceDate: z.iso.date().nullable(),
    /** `quantity × estimatedPrice`, in cents. */
    notional: decimalString.nullable(),
    commission: decimalString.nullable(),
    /** The portfolio's cash once the order fills at the estimate. */
    cashAfter: signedCashString.nullable(),
    /** Why placing the order would be refused; null when it would be accepted. */
    refusal: z
      .object({ code: OrderRefusalCodeSchema, message: z.string() })
      .nullable(),
  })
  .meta({ id: "OrderPreview" });

/** Body of `GET /api/portfolios/{id}/orders`, newest first. */
export const OrderListSchema = z
  .object({
    orders: z.array(OrderSchema),
  })
  .meta({ id: "OrderList" });

export type PortfolioIdParam = z.infer<typeof PortfolioIdParamSchema>;
export type PortfolioOrderParam = z.infer<typeof PortfolioOrderParamSchema>;
export type CreatePortfolioBody = z.infer<typeof CreatePortfolioBodySchema>;
export type CashTransferBody = z.infer<typeof CashTransferBodySchema>;
export type OrderSide = z.infer<typeof OrderSideSchema>;
export type OrderType = z.infer<typeof OrderTypeSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type OrderCloseReason = z.infer<typeof OrderCloseReasonSchema>;
export type FillRule = z.infer<typeof FillRuleSchema>;
export type PlaceOrderBody = z.infer<typeof PlaceOrderBodySchema>;
export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>;
export type PortfolioList = z.infer<typeof PortfolioListSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type Portfolio = z.infer<typeof PortfolioSchema>;
export type OrderFill = z.infer<typeof OrderFillSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderList = z.infer<typeof OrderListSchema>;
export type OrderRefusalCode = z.infer<typeof OrderRefusalCodeSchema>;
export type OrderPreview = z.infer<typeof OrderPreviewSchema>;
