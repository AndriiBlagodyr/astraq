import { z } from 'zod/v4';

// Responses are parsed with `parseJsonExact`, so every JSON number arrives as
// its source string. These schemas accept only plain decimal notation: an
// exponent or a negative price fails loudly instead of being stored.
const decimal = z.string().regex(/^\d+(\.\d+)?$/, 'Expected a decimal number');
const integer = z.string().regex(/^\d+$/, 'Expected a whole number');

export const alpacaBarSchema = z.object({
  /** Bar start. Daily bars start at midnight New York time. */
  t: z.iso.datetime({ offset: true }),
  o: decimal,
  h: decimal,
  l: decimal,
  c: decimal,
  v: integer,
});

/** `GET /v2/stocks/bars`: bars grouped by symbol, one page at a time. */
export const alpacaBarsPageSchema = z.object({
  bars: z
    .record(z.string(), z.array(alpacaBarSchema))
    .nullable()
    .transform((bars) => bars ?? {}),
  next_page_token: z.string().nullable(),
});

const splitSchema = z.object({
  symbol: z.string(),
  /** Shares before the split. */
  old_rate: decimal,
  /** Shares after the split. */
  new_rate: decimal,
  ex_date: z.iso.date(),
});

const cashDividendSchema = z.object({
  symbol: z.string(),
  /** Cash per share. */
  rate: decimal,
  ex_date: z.iso.date(),
});

/** `GET /v1/corporate-actions`. A type with no rows on a page is omitted. */
export const alpacaCorporateActionsPageSchema = z.object({
  corporate_actions: z.object({
    forward_splits: z.array(splitSchema).default([]),
    reverse_splits: z.array(splitSchema).default([]),
    cash_dividends: z.array(cashDividendSchema).default([]),
  }),
  next_page_token: z.string().nullable(),
});

export type AlpacaBar = z.infer<typeof alpacaBarSchema>;
export type AlpacaBarsPage = z.infer<typeof alpacaBarsPageSchema>;
export type AlpacaCorporateActions = z.infer<
  typeof alpacaCorporateActionsPageSchema
>['corporate_actions'];
