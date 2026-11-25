import { z } from "zod";
import { decimalString, signedDecimalString } from "./primitives";

// Prices and volumes cross the wire as decimal strings (see primitives.ts);
// a return or a statistic is a ratio, so it can be negative.
const integerString = z.string().regex(/^\d+$/);

/** Adds the rule that an optional `from` must not be after an optional `to`. */
const orderedRange = <T extends { from?: string; to?: string }>(schema: z.ZodType<T>) =>
  schema.refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "`from` must not be after `to`",
    path: ["from"],
  });

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
  /** Ticker prefix or part of the name; omit to list the symbols with candles. */
  query: z
    .string()
    .trim()
    .max(64)
    // Postgres text rejects NUL; refuse control characters here (400, not 500).
    .regex(/^[^\u0000-\u001f\u007f]*$/)
    .optional(),
});

/**
 * Path of `GET /api/symbols/{ticker}/...`. Case-insensitive; share classes
 * use a dot or dash (BRK.B, BF-B). Same 16-character cap as the column.
 */
export const TickerParamSchema = z.object({
  ticker: z
    .string()
    .regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/, "Not a ticker symbol"),
});

/**
 * Body of `GET /api/symbols`, best match first: ticker-prefix matches (an
 * exact ticker leads), then name matches, each alphabetical.
 */
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
export const CandlesQuerySchema = orderedRange(
  z.object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    adjustment: AdjustmentSchema.default("split"),
  }),
);

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

/**
 * Query of `GET /api/symbols/{ticker}/returns`. Dates are session dates and
 * bound the returns, not the closes: the first day in the range is compared
 * with the session before it. Defaults to `all`, because without the
 * dividend adjustment every ex-dividend day reads as a loss that no holder had.
 */
export const ReturnsQuerySchema = orderedRange(
  z.object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    // No `raw`: an unadjusted split day reads as a -90% return and wrecks
    // every statistic.
    adjustment: AdjustmentSchema.exclude(["raw"]).default("all"),
  }),
);

/** One session's simple return: close / previous close - 1 (0.02 is +2%). */
export const DailyReturnSchema = z
  .object({
    /** Session date, YYYY-MM-DD. */
    date: z.iso.date(),
    return: signedDecimalString,
  })
  .meta({ id: "DailyReturn" });

/**
 * Summary of a return series, computed in the same query as the returns.
 * Ratios, not percentages; rounded to 8 decimals.
 */
export const ReturnStatsSchema = z
  .object({
    /** Sessions with a return (the range's first session has none). */
    count: z.number().int().positive(),
    mean: signedDecimalString,
    /** Sample standard deviation; null with a single return. */
    stdDev: signedDecimalString.nullable(),
    /** Adjusted Fisher-Pearson skewness; null below three returns or with no spread. */
    skew: signedDecimalString.nullable(),
    best: DailyReturnSchema,
    worst: DailyReturnSchema,
    /** Share of sessions that closed up, 0 to 1. */
    upShare: decimalString,
  })
  .meta({ id: "ReturnStats" });

/** Body of `GET /api/symbols/{ticker}/returns`, oldest return first. */
export const ReturnSeriesSchema = z
  .object({
    ticker: z.string(),
    adjustment: AdjustmentSchema,
    returns: z.array(DailyReturnSchema),
    /** Null when the range holds no returns. */
    stats: ReturnStatsSchema.nullable(),
  })
  .meta({ id: "ReturnSeries" });

/** One trading day of the US equity market. */
export const MarketSessionSchema = z
  .object({
    /** The session's New York calendar date, YYYY-MM-DD. */
    date: z.iso.date(),
    opensAt: z.iso.datetime(),
    /** 16:00 New York, or earlier on a half day. */
    closesAt: z.iso.datetime(),
  })
  .meta({ id: "MarketSession" });

/**
 * Body of `GET /api/market/status`: whether the US equity market is trading
 * now, and the session that opens next.
 */
export const MarketStatusSchema = z
  .object({
    /** The instant the answer is for. */
    asOf: z.iso.datetime(),
    open: z.boolean(),
    /** The session trading now; null while the market is closed. */
    session: MarketSessionSchema.nullable(),
    /** The first session that opens after `asOf`. */
    nextSession: MarketSessionSchema,
    /**
     * Where the sessions come from: `exchange` is the exchange calendar,
     * with holidays and half days. `weekdays` is the fallback where the
     * calendar isn't loaded for these days: Monday to Friday, 09:30 to
     * 16:00 New York, so a holiday reads as a trading day.
     */
    calendar: z.enum(["exchange", "weekdays"]),
  })
  .meta({ id: "MarketStatus" });

/** The checks run on the stored daily bars after each session's refresh. */
export const DataQualityCheckNameSchema = z
  .enum(["missing_sessions", "duplicate_bars", "ohlc_sanity", "stale_symbols"])
  .meta({ id: "DataQualityCheckName" });

/** One thing a check found. */
export const DataQualityIssueSchema = z
  .object({
    ticker: z.string(),
    /** The session it is about; null when it is about the whole symbol. */
    session: z.iso.date().nullable(),
    detail: z.string(),
  })
  .meta({ id: "DataQualityIssue" });

export const DataQualityCheckSchema = z
  .object({
    check: DataQualityCheckNameSchema,
    /**
     * `skipped` is a check that couldn't run: missing sessions need the
     * exchange calendar, and none is stored.
     */
    status: z.enum(["passed", "failed", "skipped"]),
    /** Everything the check found; `issues` may hold fewer. */
    count: z.number().int().nonnegative(),
    /** The most recent of them, up to a cap. */
    issues: z.array(DataQualityIssueSchema),
  })
  .meta({ id: "DataQualityCheck" });

export const DataQualityRunSchema = z
  .object({
    /** The session the bars were expected to reach. */
    session: z.iso.date(),
    checkedAt: z.iso.datetime(),
    /** How many symbols were checked: the active ones with bars. */
    symbols: z.number().int().nonnegative(),
    checks: z.array(DataQualityCheckSchema),
  })
  .meta({ id: "DataQualityRun" });

/**
 * Body of `GET /api/market/data-quality`: the latest check of the stored
 * bars, and whether it is as recent as it should be.
 */
export const DataQualityReportSchema = z
  .object({
    /** Null until the first check has run. */
    run: DataQualityRunSchema.nullable(),
    /** The latest session a check should have covered by now. */
    expectedSession: z.iso.date(),
    /**
     * Whether `run` covers `expectedSession`. False means the refresh after
     * a close didn't finish, or didn't run: the checks are then old news.
     */
    current: z.boolean(),
  })
  .meta({ id: "DataQualityReport" });

export type DataQualityCheckName = z.infer<typeof DataQualityCheckNameSchema>;
export type DataQualityIssue = z.infer<typeof DataQualityIssueSchema>;
export type DataQualityCheck = z.infer<typeof DataQualityCheckSchema>;
export type DataQualityRun = z.infer<typeof DataQualityRunSchema>;
export type DataQualityReport = z.infer<typeof DataQualityReportSchema>;
export type MarketSessionTimes = z.infer<typeof MarketSessionSchema>;
export type MarketStatus = z.infer<typeof MarketStatusSchema>;
export type LatestClose = z.infer<typeof LatestCloseSchema>;
export type SymbolSummary = z.infer<typeof SymbolSummarySchema>;
export type SymbolSearchQuery = z.infer<typeof SymbolSearchQuerySchema>;
export type TickerParam = z.infer<typeof TickerParamSchema>;
export type SymbolList = z.infer<typeof SymbolListSchema>;
export type Adjustment = z.infer<typeof AdjustmentSchema>;
export type CandlesQuery = z.infer<typeof CandlesQuerySchema>;
export type Candle = z.infer<typeof CandleSchema>;
export type Split = z.infer<typeof SplitSchema>;
export type CandleSeries = z.infer<typeof CandleSeriesSchema>;
export type ReturnsQuery = z.infer<typeof ReturnsQuerySchema>;
export type DailyReturn = z.infer<typeof DailyReturnSchema>;
export type ReturnStats = z.infer<typeof ReturnStatsSchema>;
export type ReturnSeries = z.infer<typeof ReturnSeriesSchema>;
