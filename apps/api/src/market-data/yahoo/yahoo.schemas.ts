import { z } from 'zod';

// Responses are parsed with `parseJsonExact`, so every JSON number arrives as
// its source string. Yahoo's prices are 32-bit floats printed in full
// (124.80750274658203) and its ratios carry a `.0`; the mapper turns them
// into exact decimals and rounds.
const number = z
  .string()
  .regex(/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/, 'Expected a number');
const unixSeconds = z.string().regex(/^\d+$/, 'Expected whole seconds');

/** A column of the quote: one value per timestamp, null where Yahoo has none. */
const column = z.array(number.nullable());

const dividendSchema = z.object({
  /** Cash per share, divided by every split since. */
  amount: number,
  /** The ex-date's session open. */
  date: unixSeconds,
});

const splitSchema = z.object({
  /** The ex-date's session open. */
  date: unixSeconds,
  /** Shares after. */
  numerator: number,
  /** Shares before. */
  denominator: number,
});

const resultSchema = z.object({
  /** Each bar's session open. Missing when the range holds no bars. */
  timestamp: z.array(unixSeconds).default([]),
  // Keyed by a timestamp that is the bar's bucket, not always the event's
  // day: read `date` inside.
  events: z
    .object({
      dividends: z.record(z.string(), dividendSchema).default({}),
      splits: z.record(z.string(), splitSchema).default({}),
    })
    .default({ dividends: {}, splits: {} }),
  indicators: z.object({
    quote: z
      .array(
        z.object({
          open: column.default([]),
          high: column.default([]),
          low: column.default([]),
          close: column.default([]),
          volume: column.default([]),
        }),
      )
      .min(1),
  }),
});

/**
 * `GET /v8/finance/chart/{symbol}`: one symbol's bars as parallel arrays,
 * with the dividends and splits of the same period. OHLC and volume are
 * adjusted for every split up to today, not for dividends.
 */
export const yahooChartSchema = z.object({
  chart: z.object({
    result: z.array(resultSchema).nullable(),
    error: z
      .object({ code: z.string(), description: z.string().nullish() })
      .nullable(),
  }),
});

export type YahooChartResult = z.infer<typeof resultSchema>;
export type YahooSplit = z.infer<typeof splitSchema>;
