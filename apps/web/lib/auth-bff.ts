import { NextResponse, type NextRequest } from "next/server";
import { problemDetail } from "./api";
import {
  type AuthTokens,
  COOKIE_ACCESS,
  clearAuthCookies,
  setAuthCookies,
} from "./auth-cookies";
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

  // The api's rate limiter keys on this header; without it every user
  // behind the web server would share one bucket.
  const clientIp =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");

  const upstream = await fetch(`${env.API_URL}/api/auth/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(clientIp ? { "X-Forwarded-For": clientIp } : {}),
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

/** Revokes the session (or every session) at the api, then clears the cookies. */
export async function forwardSignOut(
  request: NextRequest,
  path: "logout" | "logout-all"
): Promise<NextResponse> {
  const accessToken = request.cookies.get(COOKIE_ACCESS)?.value;
  if (accessToken) {
    // Best effort: the cookies go regardless of whether the api answered.
    await fetch(`${env.API_URL}/api/auth/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => undefined);
  }
  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
