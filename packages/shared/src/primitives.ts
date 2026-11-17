import { z } from "zod";

// The string shapes every contract file builds on. Numbers cross the wire
// as decimal strings: JSON numbers are binary floats, and money is never a
// float (AGENTS.md). Parse at the edge that needs a number, e.g. the chart.
// Internal to this package: the schemas that use these are what's exported.

/** A decimal that is zero or more: a price, a quantity, a cash balance. */
export const decimalString = z.string().regex(/^\d+(\.\d+)?$/);

/** A decimal that can be negative: a return, realized PnL. */
export const signedDecimalString = z.string().regex(/^-?\d+(\.\d+)?$/);

/**
 * A name its owner typed, trimmed: one line, 1 to `max` characters.
 * Control characters are refused here (a 400), since Postgres text rejects
 * NUL (a 500) and a newline would break every list the name appears in.
 */
export const oneLineName = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(max, `At most ${max} characters`)
    .regex(/^[^\u0000-\u001f\u007f]+$/, "One line, no control characters");
