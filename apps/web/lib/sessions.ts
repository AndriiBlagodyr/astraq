// Pure helpers for the Settings pages: how a session's browser string and
// the user's identity read on screen. Tested in sessions.test.ts.

/**
 * A short device label from a User-Agent string: the browser and the
 * platform, like "Safari on iPhone" or "Chrome on Windows". The string is
 * what the browser reported at sign-in, never trusted for a decision, so a
 * rough reading is enough; anything unrecognised reads as "Unknown device".
 */
export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent;

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\/|CriOS\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : null;

  const platform = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac OS X|Macintosh/.test(ua)
            ? "Mac"
            : /CrOS/.test(ua)
              ? "ChromeOS"
              : /Linux/.test(ua)
                ? "Linux"
                : null;

  if (browser && platform) return `${browser} on ${platform}`;
  return browser ?? platform ?? "Unknown device";
}

/**
 * Up to two initials for the avatar: the first letters of the first two
 * words of the name, or the first letter of the email.
 */
export function initials(name: string | null, email: string): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    return words
      .slice(0, 2)
      .map((word) => word[0]!)
      .join("")
      .toUpperCase();
  }
  return (email[0] ?? "?").toUpperCase();
}

/** What the user menu shows as the account's name. */
export function displayName(name: string | null, email: string): string {
  return name?.trim() || email;
}
