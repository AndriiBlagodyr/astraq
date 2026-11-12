import { NextResponse, type NextRequest } from "next/server";
import { problemDetail } from "./api";
import {
  type AuthTokens,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  clearAuthCookies,
  isAccessTokenFresh,
  setAuthCookies,
} from "./auth-cookies";
import { refreshSession } from "./auth-refresh";
import { bffHeaders, clientIpFrom } from "./bff-headers";
import { env } from "./env";

// Shared by the sign-in and registration route handlers: both forward the
// browser's JSON body to the api with the client's IP, turn a problem
// response into one error line, and on success put the tokens in cookies
// so the browser never sees them.

export type CredentialsCopy = {
  /** The 429 message; the api rate-limits both endpoints per IP. */
  rateLimited: string;
  /** When the problem response has no detail of its own. */
  failed: string;
  /** Replaces the api's 409 detail, when a route must not echo it. */
  conflict?: string;
};

export async function forwardCredentials(
  request: NextRequest,
  path: "login" | "register",
  copy: CredentialsCopy,
  successStatus = 200
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const upstream = await fetch(`${env.API_URL}/api/auth/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // The api's rate limiter keys on the browser's address; without
      // these every user behind the web server would share one bucket.
      ...bffHeaders(clientIpFrom(request.headers)),
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const error =
      upstream.status === 429
        ? copy.rateLimited
        : upstream.status === 409 && copy.conflict
          ? copy.conflict
          : await problemDetail(upstream, copy.failed);
    return NextResponse.json({ error }, { status: upstream.status });
  }

  const tokens = (await upstream.json()) as AuthTokens;
  const response = NextResponse.json({ ok: true }, { status: successStatus });
  setAuthCookies(response, tokens);
  return response;
}

/**
 * Revokes the session (or every session) at the api, then clears the cookies.
 *
 * proxy.ts skips /api/auth/*, so nothing has refreshed the access token for
 * this request, and the browser drops that cookie after 10 minutes. Without
 * the refresh below, signing out from a tab that sat idle would clear the
 * cookies and leave the session (or all of them) alive at the api.
 */
export async function forwardSignOut(
  request: NextRequest,
  path: "logout" | "logout-all"
): Promise<NextResponse> {
  let accessToken = request.cookies.get(COOKIE_ACCESS)?.value;
  const refreshToken = request.cookies.get(COOKIE_REFRESH)?.value;
  // "rejected" means this session is already over at the api.
  let sessionOver = !accessToken && !refreshToken;
  // The pair a refresh below returned. That refresh spent the cookie's
  // refresh token, so a response that leaves the user signed in must carry
  // the new pair: the old token, sent again, reads as reuse at the api and
  // revokes the session.
  let rotated: AuthTokens | null = null;

  if ((!accessToken || !isAccessTokenFresh(accessToken)) && refreshToken) {
    const refreshed = await refreshSession(env.API_URL, refreshToken);
    if (refreshed.kind === "ok") {
      rotated = refreshed.tokens;
      accessToken = rotated.accessToken;
    } else if (refreshed.kind === "rejected") sessionOver = true;
  }

  let revoked = false;
  if (accessToken && !sessionOver) {
    revoked = await fetch(`${env.API_URL}/api/auth/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(
      (upstream) => upstream.ok,
      () => false
    );
  }

  // "Log out everywhere" is a promise about other devices, so it must not
  // report success unless the api revoked them. A plain sign-out stays best
  // effort: this device loses its cookies whether or not the api answered.
  if (path === "logout-all" && !revoked) {
    const response = NextResponse.json(
      { error: "Couldn't sign out everywhere" },
      { status: sessionOver ? 401 : 502 }
    );
    // A dead session can't be used to revoke the others; sign in again first.
    if (sessionOver) clearAuthCookies(response);
    else if (rotated) setAuthCookies(response, rotated);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
