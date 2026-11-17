// How numbers read on screen, in one place, so a price is the same string
// in a table, a header, and a chart readout. Display only: the stored and
// served values stay decimal strings, and nothing here feeds arithmetic.

const price = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/**
 * A price for display: "150.10", "1,234.50", "0.0125". The api trims
 * trailing zeros ("150.1"), which reads ragged in a column of closes.
 * Anything that isn't a number comes back as it was.
 */
export function formatPrice(value: string): string {
  const number = Number(value);
  return Number.isFinite(number) ? price.format(number) : value;
}

/**
 * A change in price, always signed: "+1.23", "-0.0035". It has a price's
 * precision, so a move of a third of a cent on a sub-dollar stock doesn't
 * read "+0.00" beside "+10.60%".
 */
export const signedPriceChange = new Intl.NumberFormat("en-US", {
  signDisplay: "always",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/**
 * A day change already in percent (1.5 for 1.5%), always signed: "+1.50".
 * The caller appends the "%".
 */
export const signedPercentPoints = new Intl.NumberFormat("en-US", {
  signDisplay: "always",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** A ratio as "+1.23%" / "-0.45%" / "0.00%": a return or a statistic. */
export const signedPercent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

/** A ratio as "60.0%": a share or a deviation, which have no sign. */
export const plainPercent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

/** A ratio for an axis tick: short, signed, one decimal at most. */
export const tickPercent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

/** A plain figure with two decimals: "1.25". */
export const twoDecimals = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
