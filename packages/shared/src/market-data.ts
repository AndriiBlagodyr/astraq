import { z } from "zod";

// Prices and volumes cross the wire as decimal strings: JSON numbers are
// binary floats, and money is never a float (AGENTS.md). Parse at the edge
// that needs a number, e.g. the chart.
const decimalString = z.string().regex(/^\d+(\.\d+)?$/);
const integerString = z.string().regex(/^\d+$/);

/**
 * The latest stored session of a symbol. `previousClose` is split-adjusted
 * to the latest session's shares, so a split between the two bars doesn't
 * read as a crash; dividends aren't applied (the usual day-change basis).
 */
export const LatestCloseSchema = z
  .object({
    /** Session date, YYYY-MM-DD. */
    date: z.iso.date(),
    close: decimalString,
    /** The session before; null when only one bar is stored. */
    previousClose: decimalString.nullable(),
  })
  .meta({ id: "LatestClose" });

/** A tradable instrument. */
export const SymbolSummarySchema = z
  .object({
    ticker: z.string(),
    name: z.string(),
    /** MIC exchange code, e.g. XNAS. */
    exchange: z.string(),
    /** Null until the symbol has stored candles. */
    latestClose: LatestCloseSchema.nullable(),
  })
  .meta({ id: "SymbolSummary" });

/** Query of `GET /api/symbols`. */
export const SymbolSearchQuerySchema = z.object({
  /** Ticker prefix or part of the name; omit to list every active symbol. */
  query: z.string().trim().max(64).optional(),
});

/** Body of `GET /api/symbols`, ordered by ticker. */
export const SymbolListSchema = z
  .object({
    symbols: z.array(SymbolSummarySchema),
  })
  .meta({ id: "SymbolList" });

/**
 * How historical prices are adjusted for corporate actions:
 * - `raw`: as traded that day;
 * - `split`: split-adjusted, comparable across splits (volume too);
 * - `all`: split- and dividend-adjusted, a total-return series for research.
 */
export const AdjustmentSchema = z
  .enum(["raw", "split", "all"])
  .meta({ id: "Adjustment" });

/** Query of `GET /api/symbols/{ticker}/candles`. Dates are session dates. */
export const CandlesQuerySchema = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    adjustment: AdjustmentSchema.default("split"),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "`from` must not be after `to`",
    path: ["from"],
  });

/** One daily bar. */
export const CandleSchema = z
  .object({
    /** Session date, YYYY-MM-DD. */
    time: z.iso.date(),
    open: decimalString,
    high: decimalString,
    low: decimalString,
    close: decimalString,
    volume: integerString,
  })
  .meta({ id: "Candle" });

/** A stock split: `from` old shares became `to` new ones (NVDA 2024: 1, 10). */
export const SplitSchema = z
  .object({
    /** First session priced after the split, YYYY-MM-DD. */
    exDate: z.iso.date(),
    from: decimalString,
    to: decimalString,
  })
  .meta({ id: "Split" });

/** Body of `GET /api/symbols/{ticker}/candles`, oldest bar first. */
export const CandleSeriesSchema = z
  .object({
    ticker: z.string(),
    adjustment: AdjustmentSchema,
    candles: z.array(CandleSchema),
    /** Splits that went ex within the range, oldest first. */
    splits: z.array(SplitSchema),
  })
  .meta({ id: "CandleSeries" });

export type LatestClose = z.infer<typeof LatestCloseSchema>;
export type SymbolSummary = z.infer<typeof SymbolSummarySchema>;
export type SymbolSearchQuery = z.infer<typeof SymbolSearchQuerySchema>;
export type SymbolList = z.infer<typeof SymbolListSchema>;
export type Adjustment = z.infer<typeof AdjustmentSchema>;
export type CandlesQuery = z.infer<typeof CandlesQuerySchema>;
export type Candle = z.infer<typeof CandleSchema>;
export type Split = z.infer<typeof SplitSchema>;
export type CandleSeries = z.infer<typeof CandleSeriesSchema>;
