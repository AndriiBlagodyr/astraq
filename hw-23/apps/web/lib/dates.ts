// Session dates travel as `YYYY-MM-DD` strings (the API's candle `time`, the
// chart's `?from=&to=`) and become Date objects only for arithmetic, always
// at 00:00 UTC. These are the only conversions between the forms; the api has
// the same pair in apps/api/src/common/dates.ts.

/** The session date at 00:00 UTC. */
export function utcMidnight(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

/** The UTC calendar date of an instant, `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-30). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = utcMidnight(value);
  return !Number.isNaN(date.getTime()) && toIsoDate(date) === value;
}
