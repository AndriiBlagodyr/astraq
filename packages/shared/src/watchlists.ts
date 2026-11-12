import { z } from "zod";
import { LatestCloseSchema, TickerParamSchema } from "./market-data";

const decimalString = z.string().regex(/^\d+(\.\d+)?$/);

/** A watchlist's name as the user typed it, trimmed; one line, up to 64 characters. */
const watchlistName = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(64, "At most 64 characters")
  .regex(/^[^\u0000-\u001f\u007f]+$/, "One line, no control characters");

/** Path of `/api/watchlists/{id}/...`. Watchlist ids are UUIDs. */
export const WatchlistIdParamSchema = z.object({
  id: z.uuid(),
});

/** Path of `/api/watchlists/{id}/items/{ticker}`. */
export const WatchlistItemParamSchema = WatchlistIdParamSchema.extend(
  TickerParamSchema.shape,
);

/** Body of `POST /api/watchlists` and `PATCH /api/watchlists/{id}`. */
export const WatchlistNameBodySchema = z
  .object({ name: watchlistName })
  .meta({ id: "WatchlistNameBody" });

/** Body of `POST /api/watchlists/{id}/items`. */
export const AddWatchlistItemBodySchema = z
  .object({ ticker: TickerParamSchema.shape.ticker })
  .meta({ id: "AddWatchlistItemBody" });

/**
 * Body of `PUT /api/watchlists/{id}/items/order`: every ticker in the list,
 * in the wanted order. A ticker missing from, or foreign to, the list is a
 * 400, so a stale client can't silently drop a symbol.
 */
export const ReorderWatchlistBodySchema = z
  .object({
    tickers: z.array(TickerParamSchema.shape.ticker).max(500),
  })
  .meta({ id: "ReorderWatchlistBody" });

/** One point of a row's sparkline: a split-adjusted close. */
export const SparklinePointSchema = z
  .object({
    /** Session date, YYYY-MM-DD. */
    date: z.iso.date(),
    close: decimalString,
  })
  .meta({ id: "SparklinePoint" });

/** A symbol on a watchlist, with what its row shows. */
export const WatchlistItemSchema = z
  .object({
    ticker: z.string(),
    name: z.string(),
    exchange: z.string(),
    /** Null until the symbol has stored candles. */
    latestClose: LatestCloseSchema.nullable(),
    /** The last sessions' closes, oldest first; empty without candles. */
    sparkline: z.array(SparklinePointSchema),
    /** When the symbol was added, ISO 8601 UTC. */
    addedAt: z.iso.datetime(),
  })
  .meta({ id: "WatchlistItem" });

/** A watchlist as the index lists it. */
export const WatchlistSummarySchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    symbolCount: z.int().nonnegative(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: "WatchlistSummary" });

/** Body of `GET /api/watchlists`, in the user's order. */
export const WatchlistListSchema = z
  .object({
    watchlists: z.array(WatchlistSummarySchema),
  })
  .meta({ id: "WatchlistList" });

/** A watchlist with its symbols, in the user's order. */
export const WatchlistSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    items: z.array(WatchlistItemSchema),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: "Watchlist" });

export type WatchlistIdParam = z.infer<typeof WatchlistIdParamSchema>;
export type WatchlistItemParam = z.infer<typeof WatchlistItemParamSchema>;
export type WatchlistNameBody = z.infer<typeof WatchlistNameBodySchema>;
export type AddWatchlistItemBody = z.infer<typeof AddWatchlistItemBodySchema>;
export type ReorderWatchlistBody = z.infer<typeof ReorderWatchlistBodySchema>;
export type SparklinePoint = z.infer<typeof SparklinePointSchema>;
export type WatchlistItem = z.infer<typeof WatchlistItemSchema>;
export type WatchlistSummary = z.infer<typeof WatchlistSummarySchema>;
export type WatchlistList = z.infer<typeof WatchlistListSchema>;
export type Watchlist = z.infer<typeof WatchlistSchema>;
