import type { components } from "@astraq/sdk";
import { utcMidnight } from "./dates";

// How the market's clock reads on Today (docs/ui-plan.md § Today, Phase 3).
// The api decides open or closed and which session is next, by the same
// clock an order meets; this only puts it into words. Times are New York's,
// said as "ET": the exchange's hours are the same for every viewer.

export type MarketStatus = components["schemas"]["MarketStatus_Output"];
type Session = MarketStatus["nextSession"];

const newYorkTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});

const newYorkClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/New_York",
  hour: "2-digit",
  minute: "2-digit",
});

const newYorkDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
});

const sessionDay = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const time = (instant: string) => `${newYorkTime.format(new Date(instant))} ET`;

/** A session that ends before 16:00 New York: a half day. */
const closesEarly = (session: Session) =>
  newYorkClock.format(new Date(session.closesAt)) < "16:00";

export type MarketStatusText = {
  label: "Market open" | "Market closed";
  /** One sentence: when it closes or opens. */
  detail: string;
  /** The session after, while the market is open; null while it is closed. */
  next: string | null;
  /** Set when the hours are the weekday rule, which knows no holidays. */
  caveat: string | null;
};

/** The status as the words Today shows. */
export function marketStatusText(status: MarketStatus): MarketStatusText {
  const { session, nextSession } = status;
  const today = newYorkDate.format(new Date(status.asOf));
  const nextDay =
    nextSession.date === today
      ? "today"
      : sessionDay.format(utcMidnight(nextSession.date));
  const earlyNext = closesEarly(nextSession)
    ? `, closing early at ${time(nextSession.closesAt)}`
    : "";
  const caveat =
    status.calendar === "weekdays"
      ? "The exchange calendar isn't loaded for these days, so holidays and half days aren't known: weekday hours are assumed."
      : null;

  if (status.open && session) {
    return {
      label: "Market open",
      detail: closesEarly(session)
        ? `Closes early today, at ${time(session.closesAt)}.`
        : `Closes at ${time(session.closesAt)}.`,
      next: `Next session: ${nextDay}${earlyNext}.`,
      caveat,
    };
  }
  return {
    label: "Market closed",
    detail: `Opens ${nextDay} at ${time(nextSession.opensAt)}${earlyNext}.`,
    next: null,
    caveat,
  };
}
