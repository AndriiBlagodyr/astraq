import { z } from "zod";

// The strategy DSL (ROADMAP Phase 5 item 1, ADR 0012): a trading rule as a
// versioned JSON document. The api validates and stores it, the Python
// backtester runs it, and later the paper-trading job evaluates it after
// each close.
//
// This file is the one definition. `pnpm contract` turns it into
// `json-schema/strategy.schema.json`, and `pnpm contract:ml` turns that into
// the Pydantic models in `services/ml/app/contracts/strategy.py`. So every
// constraint here must be one JSON Schema can carry:
//
// - no `.refine`, `.transform`, or `.default`: none of them reaches Python;
// - "above zero" is part of a string's pattern, without lookahead (Pydantic
//   checks patterns with a regex engine that has none);
// - every object is strict and every key is required. An absent rule is
//   `null`, not a missing key.
//
// `fixtures/strategies.json` lists documents both sides must accept and
// documents both must refuse.

/** The version of the document's shape. A change that old engines can't read is a new number. */
export const STRATEGY_VERSION = 1;

/** A decimal that is zero or more, without a leading zero: "30", "0.5". */
const levelString = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,6})?$/)
  .describe("A decimal that is zero or more, up to 6 decimal places");

/** A percentage above zero, up to 100, with at most 2 decimal places. */
const percentString = z
  .string()
  .regex(/^(?:100(?:\.0{1,2})?|[1-9]\d?(?:\.\d{1,2})?|0\.(?:[1-9]\d?|0[1-9]))$/)
  .describe("A percentage above 0, up to 100, with at most 2 decimal places");

/** A gain in percent: above zero, with no upper bound that matters. */
const gainPercentString = z
  .string()
  .regex(/^(?:[1-9]\d{0,3}(?:\.\d{1,2})?|0\.(?:[1-9]\d?|0[1-9]))$/)
  .describe("A percentage above 0 with at most 2 decimal places");

/** Dollars above zero, in cents. */
const notionalString = z
  .string()
  .regex(/^(?:[1-9]\d{0,12}(?:\.\d{1,2})?|0\.(?:[1-9]\d?|0[1-9]))$/)
  .describe("A cash amount above zero with at most 2 decimal places");

/** A number of standard deviations: above zero, below 10. */
const deviationsString = z
  .string()
  .regex(/^(?:[1-9](?:\.\d{1,2})?|0\.(?:[1-9]\d?|0[1-9]))$/)
  .describe("Standard deviations: above 0, below 10, at most 2 decimal places");

/** How many bars an indicator looks back over. */
const period = z.int().min(2).max(400);

/** The prices of a bar an indicator can be computed from. */
export const PriceFieldSchema = z
  .enum(["open", "high", "low", "close"])
  .meta({ id: "PriceField" });

// --- Series: a value per bar ------------------------------------------------

/** One field of the bar itself. */
export const BarSeriesSchema = z
  .strictObject({
    type: z.literal("bar"),
    field: z.enum(["open", "high", "low", "close", "volume"]),
  })
  .meta({ id: "BarSeries" });

/** The same number on every bar: the 30 in "RSI below 30". */
export const ConstantSeriesSchema = z
  .strictObject({
    type: z.literal("constant"),
    value: levelString,
  })
  .meta({ id: "ConstantSeries" });

/** Simple moving average of the last `period` bars. */
export const SmaSeriesSchema = z
  .strictObject({
    type: z.literal("sma"),
    period,
    source: PriceFieldSchema,
  })
  .meta({ id: "SmaSeries" });

/** Exponential moving average, seeded with the simple average of the first `period` bars. */
export const EmaSeriesSchema = z
  .strictObject({
    type: z.literal("ema"),
    period,
    source: PriceFieldSchema,
  })
  .meta({ id: "EmaSeries" });

/** Relative strength index of the close, with Wilder's smoothing; 0 to 100. */
export const RsiSeriesSchema = z
  .strictObject({
    type: z.literal("rsi"),
    period,
  })
  .meta({ id: "RsiSeries" });

/** Average true range, with Wilder's smoothing; in dollars per share. */
export const AtrSeriesSchema = z
  .strictObject({
    type: z.literal("atr"),
    period,
  })
  .meta({ id: "AtrSeries" });

/**
 * One line of the Bollinger bands of the close: the simple average
 * (`middle`), or it plus or minus `deviations` standard deviations of the
 * same bars.
 */
export const BollingerSeriesSchema = z
  .strictObject({
    type: z.literal("bollinger"),
    period,
    deviations: deviationsString,
    band: z.enum(["upper", "middle", "lower"]),
  })
  .meta({ id: "BollingerSeries" });

/**
 * A value per bar. An indicator has none until it has seen enough bars,
 * and a condition that reads a series without a value is false.
 */
export const StrategySeriesSchema = z
  .discriminatedUnion("type", [
    BarSeriesSchema,
    ConstantSeriesSchema,
    SmaSeriesSchema,
    EmaSeriesSchema,
    RsiSeriesSchema,
    AtrSeriesSchema,
    BollingerSeriesSchema,
  ])
  .meta({ id: "StrategySeries" });
export type StrategySeries = z.infer<typeof StrategySeriesSchema>;

// --- Conditions: true or false per bar --------------------------------------

/** `left` against `right` on the same bar. */
export const CompareConditionSchema = z
  .strictObject({
    type: z.literal("compare"),
    left: StrategySeriesSchema,
    operator: z.enum(["gt", "gte", "lt", "lte"]),
    right: StrategySeriesSchema,
  })
  .meta({ id: "CompareCondition" });
export type CompareCondition = z.infer<typeof CompareConditionSchema>;

/**
 * `left` crossing `right`: for `above`, at or below it on the bar before
 * and above it on this one. True on the bar of the crossing only.
 */
export const CrossConditionSchema = z
  .strictObject({
    type: z.literal("cross"),
    left: StrategySeriesSchema,
    direction: z.enum(["above", "below"]),
    right: StrategySeriesSchema,
  })
  .meta({ id: "CrossCondition" });
export type CrossCondition = z.infer<typeof CrossConditionSchema>;

export interface AllCondition {
  type: "all";
  conditions: StrategyCondition[];
}
export interface AnyCondition {
  type: "any";
  conditions: StrategyCondition[];
}
export type StrategyCondition =
  | CompareCondition
  | CrossCondition
  | AllCondition
  | AnyCondition;

/** AND: every condition holds on this bar. */
export const AllConditionSchema: z.ZodType<AllCondition> = z
  .strictObject({
    type: z.literal("all"),
    get conditions() {
      return z.array(StrategyConditionSchema).min(2).max(8);
    },
  })
  .meta({ id: "AllCondition" });

/** OR: at least one condition holds on this bar. */
export const AnyConditionSchema: z.ZodType<AnyCondition> = z
  .strictObject({
    type: z.literal("any"),
    get conditions() {
      return z.array(StrategyConditionSchema).min(2).max(8);
    },
  })
  .meta({ id: "AnyCondition" });

export const StrategyConditionSchema: z.ZodType<StrategyCondition> = z
  .union([
    CompareConditionSchema,
    CrossConditionSchema,
    AllConditionSchema,
    AnyConditionSchema,
  ])
  .meta({ id: "StrategyCondition" });

// --- The rest of the document -----------------------------------------------

/**
 * How much an entry buys:
 * - `fixed_notional`: the same dollar amount every time;
 * - `percent_of_equity`: a share of what the portfolio is worth at the close
 *   that gave the signal.
 *
 * Either is turned into shares the way a paper order sized in dollars is:
 * at the signal bar's close with slippage, rounded down to a millionth.
 */
export const PositionSizingSchema = z
  .discriminatedUnion("type", [
    z
      .strictObject({
        type: z.literal("fixed_notional"),
        amount: notionalString,
      })
      .meta({ id: "FixedNotionalSizing" }),
    z
      .strictObject({
        type: z.literal("percent_of_equity"),
        percent: percentString,
      })
      .meta({ id: "PercentOfEquitySizing" }),
  ])
  .meta({ id: "PositionSizing" });
export type PositionSizing = z.infer<typeof PositionSizingSchema>;

/**
 * A long-only rule for one symbol: flat or in, never short, one position at
 * a time.
 *
 * Everything is decided on a bar's close and acted on at the next bar's
 * open (ADR 0008). That holds for the stop and the target too: they are
 * exits checked at the close against the entry price, not orders resting in
 * the market, because the fill model has no stop order.
 */
export const StrategyDefinitionSchema = z
  .strictObject({
    version: z.literal(STRATEGY_VERSION),
    /** While flat: buy when this holds. */
    entry: StrategyConditionSchema,
    /** While in a position: sell all of it when this holds. Null for none. */
    exit: StrategyConditionSchema.nullable(),
    /** Sell when the close is this far below the entry price. Null for none. */
    stopLoss: z
      .strictObject({ percent: percentString })
      .meta({ id: "StopLoss" })
      .nullable(),
    /** Sell when the close is this far above the entry price. Null for none. */
    takeProfit: z
      .strictObject({ percent: gainPercentString })
      .meta({ id: "TakeProfit" })
      .nullable(),
    sizing: PositionSizingSchema,
  })
  .meta({ id: "StrategyDefinition" });
export type StrategyDefinition = z.infer<typeof StrategyDefinitionSchema>;
