// Session dates cross the api as `YYYY-MM-DD` strings and are stored as that
// day at 00:00 UTC (`candles_daily.ts`, `corporate_actions.ex_date`). These
// are the only two conversions between the forms.

/** The session date at 00:00 UTC. */
export function utcMidnight(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** The UTC calendar date of an instant, `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
