import type {
  ReviewAccess,
  ReviewAccessCredentials,
  ReviewAccessState,
} from "@astraq/shared";

// Review accounts as /admin/access words them (ROADMAP "Review access" side
// track). Pure: the read is in lib/review-access-api.ts, which needs the
// request's cookies.

export type { ReviewAccess, ReviewAccessCredentials };

export const accessStateBadge: Record<
  ReviewAccessState,
  { tone: "positive" | "neutral" | "negative"; label: string }
> = {
  active: { tone: "positive", label: "Active" },
  expired: { tone: "neutral", label: "Expired" },
  revoked: { tone: "negative", label: "Revoked" },
};

/** Where the account's password stands, in a few words. */
export function passwordStatus(account: ReviewAccess): string {
  if (account.sharedCredentials) return "Shared, fixed";
  if (account.mustChangePassword) return "Not changed yet";
  return "Changed by them";
}

/**
 * The link to send: the sign-in page with the email filled in. The password
 * is never part of it; a URL ends up in history, logs, and chat previews.
 */
export function signInLink(origin: string, email: string): string {
  return `${origin}/login?email=${encodeURIComponent(email)}`;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** A date as `<input type="date">` holds it, in the viewer's time zone. */
export function dateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The default end date of a new account: two weeks from `now`. */
export function defaultEndDate(now: Date, days = 14): string {
  const end = new Date(now);
  end.setDate(end.getDate() + days);
  return dateInputValue(end);
}

/**
 * The last moment of a date picked in the viewer's time zone, as the api
 * takes it: "until the 11th" includes the 11th. Null for an unreadable date.
 */
export function endOfDay(dateInput: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
  if (!match) return null;
  const end = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    23,
    59,
    59,
    999
  );
  return Number.isNaN(end.getTime()) ? null : end.toISOString();
}
