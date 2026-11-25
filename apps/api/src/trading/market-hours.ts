// US equity session times, as pure functions of an instant. A session is
// named by its New York calendar date, the same `YYYY-MM-DD` a daily bar
// carries (`candles_daily.ts`).
//
// Holidays and half days come from the exchange calendar (`market_sessions`,
// ROADMAP Phase 3 item 5), which the caller loads and passes in as a
// `SessionCalendar`. For a date the calendar doesn't cover (none is loaded,
// or the instant is outside what is), the rule is the one from before it
// existed: Monday to Friday, 09:30 to 16:00.

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

/** One trading day: when it opens and closes, as instants. */
export interface MarketSession {
  /** The session's New York calendar date, YYYY-MM-DD. */
  date: string;
  open: Date;
  close: Date;
}

/**
 * The exchange calendar between two dates. A date from `from` to `to`
 * without a session is a day the market is closed; a date outside them is
 * unknown, and falls back to the weekday rule.
 */
export interface SessionCalendar {
  from: string;
  to: string;
  sessions: ReadonlyMap<string, MarketSession>;
}

/** A calendar covering `from` to `to` with these sessions. */
export function sessionCalendar(
  from: string,
  to: string,
  sessions: MarketSession[],
): SessionCalendar {
  return {
    from,
    to,
    sessions: new Map(sessions.map((session) => [session.date, session])),
  };
}

const covers = (
  calendar: SessionCalendar | null,
  date: string,
): calendar is SessionCalendar =>
  calendar !== null && calendar.from <= date && date <= calendar.to;

/**
 * A New York wall-clock time on a date, as an instant; `minutes` counts
 * from midnight. New York is UTC-4 in summer and UTC-5 in winter, and the
 * clocks change at 02:00 on a Sunday, so for any time the market trades at
 * one of the two candidates reads back as that time.
 */
export function newYorkInstant(date: string, minutes: number): Date {
  const midnight = Date.parse(`${date}T00:00:00.000Z`);
  const summer = new Date(midnight + (minutes + 4 * 60) * 60_000);
  return newYorkParts(summer).minutes === minutes
    ? summer
    : new Date(midnight + (minutes + 5 * 60) * 60_000);
}

/** The New York calendar date of an instant: the session it belongs to. */
export function sessionDate(instant: Date): string {
  return newYorkParts(instant).date;
}

/**
 * 09:30 New York on a session date, as an instant: when a daily bar's
 * session opens. Every session opens at 09:30; a half day only closes early.
 */
export function sessionOpen(date: string): Date {
  return newYorkInstant(date, OPEN_MINUTES);
}

/**
 * Whether the market is trading at `instant`. With a calendar that covers
 * the day: inside that day's session, so a holiday is closed and a half day
 * ends early. Without one: Monday to Friday, 09:30 up to 16:00 New York.
 */
export function isRegularSession(
  instant: Date,
  calendar: SessionCalendar | null = null,
): boolean {
  const { date, minutes, weekday } = newYorkParts(instant);
  if (covers(calendar, date)) {
    const session = calendar.sessions.get(date);
    return (
      session !== undefined &&
      instant.getTime() >= session.open.getTime() &&
      instant.getTime() < session.close.getTime()
    );
  }
  return (
    weekday !== 'Sat' &&
    weekday !== 'Sun' &&
    minutes >= OPEN_MINUTES &&
    minutes < CLOSE_MINUTES
  );
}

/**
 * The first session that opens after `instant`: where an order placed now
 * and not filled at once meets its first bar. Days the calendar covers are
 * sessions or not as it says; the rest are sessions on weekdays.
 */
export function nextSession(
  instant: Date,
  calendar: SessionCalendar | null = null,
): { date: string; open: Date } {
  let date = sessionDate(instant);
  // The longest closure on record is under two weeks.
  for (let day = 0; day < 30; day += 1, date = nextDate(date)) {
    let open: Date | undefined;
    if (covers(calendar, date)) {
      open = calendar.sessions.get(date)?.open;
    } else {
      const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay();
      if (weekday !== 0 && weekday !== 6) open = sessionOpen(date);
    }
    if (open !== undefined && open.getTime() > instant.getTime()) {
      return { date, open };
    }
  }
  throw new RangeError(`No session opens within 30 days of ${date}`);
}

/** Whether the market trades now, and the session that opens next. */
export interface MarketStatus {
  open: boolean;
  /** The session trading at the instant; null while the market is closed. */
  session: MarketSession | null;
  next: MarketSession;
  /**
   * True when today and the next session's day are both in the calendar.
   * False when either came from the weekday rule, which knows no holidays.
   */
  fromCalendar: boolean;
}

/**
 * The market at `instant`: open or closed, the session it is in, and the
 * next one to open. The same two functions the order rules use answer it,
 * so the status a page shows is the clock an order placed now meets.
 */
export function marketStatus(
  instant: Date,
  calendar: SessionCalendar | null = null,
): MarketStatus {
  // A session by its date: the calendar's, or 09:30 to 16:00 without one.
  const sessionOn = (date: string): MarketSession =>
    (covers(calendar, date) ? calendar.sessions.get(date) : undefined) ?? {
      date,
      open: sessionOpen(date),
      close: newYorkInstant(date, CLOSE_MINUTES),
    };
  const today = sessionDate(instant);
  const open = isRegularSession(instant, calendar);
  const next = sessionOn(nextSession(instant, calendar).date);
  return {
    open,
    session: open ? sessionOn(today) : null,
    next,
    fromCalendar: covers(calendar, today) && covers(calendar, next.date),
  };
}

/**
 * The session on a date, or null on a day the market is closed: the
 * calendar's where it covers the date, otherwise a weekday's 09:30 to 16:00.
 */
export function sessionOn(
  date: string,
  calendar: SessionCalendar | null = null,
): MarketSession | null {
  if (covers(calendar, date)) return calendar.sessions.get(date) ?? null;
  const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  if (weekday === 0 || weekday === 6) return null;
  return {
    date,
    open: sessionOpen(date),
    close: newYorkInstant(date, CLOSE_MINUTES),
  };
}

/**
 * The latest session that had closed by `instant`: the one whose daily bar
 * is the newest that can exist. At the closing instant itself the session
 * counts as closed, as it does for `isRegularSession`.
 */
export function lastClosedSession(
  instant: Date,
  calendar: SessionCalendar | null = null,
): MarketSession {
  const date = new Date(`${sessionDate(instant)}T00:00:00.000Z`);
  // The longest closure on record is under two weeks.
  for (let day = 0; day < 30; day += 1) {
    const session = sessionOn(date.toISOString().slice(0, 10), calendar);
    if (session !== null && session.close.getTime() <= instant.getTime()) {
      return session;
    }
    date.setUTCDate(date.getUTCDate() - 1);
  }
  throw new RangeError(`No session closed within 30 days of ${instant.toISOString()}`);
}

/**
 * The first session that closes after `instant`: the one trading now, or
 * the next to open.
 */
export function nextSessionToClose(
  instant: Date,
  calendar: SessionCalendar | null = null,
): MarketSession {
  const { session, next } = marketStatus(instant, calendar);
  return session ?? next;
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
