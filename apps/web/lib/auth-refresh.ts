import type { AuthTokens } from "./auth-cookies";

/**
 * What the api said to a refresh token. "rejected" means the session is over
 * (expired, revoked, or a reused token): the cookies are stale and can go.
 * "unavailable" means nobody answered or the api failed (a redeploy, a
 * network blip): the session may be fine, so the cookies must stay.
 */
export type RefreshOutcome =
  | { kind: "ok"; tokens: AuthTokens }
  | { kind: "rejected" }
  | { kind: "unavailable" };

/**
 * Exchanges a refresh token for a new pair. Takes the api's URL as an
 * argument so proxy.ts can use it without importing lib/env.
 */
export async function refreshSession(
  apiUrl: string,
  refreshToken: string
): Promise<RefreshOutcome> {
  try {
    const response = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (response.ok) {
      return { kind: "ok", tokens: (await response.json()) as AuthTokens };
    }
    // 401 is every "this token is no good" case; 400 is a malformed one.
    return response.status === 401 || response.status === 400
      ? { kind: "rejected" }
      : { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}
