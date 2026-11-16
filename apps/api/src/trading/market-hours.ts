// US equity session times, as pure functions of an instant. A session is
// named by its New York calendar date, the same `YYYY-MM-DD` a daily bar
// carries (`candles_daily.ts`).
//
// Weekends are known here; holidays and half days are not. They arrive with
// the exchange calendar (ROADMAP Phase 3 item 5). Until then `isRegularSession`
// says "open" at 11:00 on Thanksgiving, and a market order placed then fills
// at the last close instead of waiting for the next open.

const newYork = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
});

function newYorkParts(instant: Date) {
  const parts: Record<string, string> = {};
  for (const part of newYork.formatToParts(instant)) {
    parts[part.type] = part.value;
  }
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    weekday: parts.weekday,
  };
}

const OPEN_MINUTES = 9 * 60 + 30;
const CLOSE_MINUTES = 16 * 60;

/** The New York calendar date of an instant: the session it belongs to. */
export function sessionDate(instant: Date): string {
  return newYorkParts(instant).date;
}

/**
 * 09:30 New York on a session date, as an instant. New York is UTC-4 in
 * summer and UTC-5 in winter, and the clocks change at 02:00 on a Sunday,
 * so one of the two candidates always reads back as 09:30.
 */
export function sessionOpen(date: string): Date {
  const summer = new Date(`${date}T13:30:00.000Z`);
  return newYorkParts(summer).minutes === OPEN_MINUTES
    ? summer
    : new Date(`${date}T14:30:00.000Z`);
}

/** Monday to Friday, 09:30 up to 16:00 New York. Holidays count as open. */
export function isRegularSession(instant: Date): boolean {
  const { minutes, weekday } = newYorkParts(instant);
  return (
    weekday !== 'Sat' &&
    weekday !== 'Sun' &&
    minutes >= OPEN_MINUTES &&
    minutes < CLOSE_MINUTES
  );
}

/** The calendar date after `date`. */
export function nextDate(date: string): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/**
 * The first session date whose bar an order placed at `placedAt` may fill
 * on: one that opened after the order existed (ADR 0008's look-ahead
 * guard). Placed before 09:30, that's the same day; from 09:30 on, the next
 * day. Only trading days have bars, so "the next day" needs no calendar.
 */
export function firstEligibleSession(placedAt: Date): string {
  const date = sessionDate(placedAt);
  return placedAt.getTime() < sessionOpen(date).getTime() ? date : nextDate(date);
}
