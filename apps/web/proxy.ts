import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  accessCookieOpts,
  clearCookieOpts,
  isAccessTokenFresh,
  refreshCookieOpts,
} from "./lib/auth-cookies";
import { refreshSession } from "./lib/auth-refresh";

// The web's proxy (Next 16's name for middleware): runs before every page
// and route handler. It keeps the session alive and adds the security
// headers (ROADMAP Phase 2 items 1 and 3; ADR 0006).
//
// Session: a fresh access token passes; an expired one is refreshed here,
// before rendering, so server components always see a valid token and the
// user stays signed in for weeks on a phone. No usable token sends the
// browser to /login, which is how every page is private. This replaced the
// Phase 1 SITE_PASSWORD gate that used to live in this file.
//
// It reads process.env itself instead of importing lib/env: the proxy
// shouldn't rely on shared modules, and lib/env validates API_URL at boot.

// Routes the browser may reach without a session.
const PUBLIC_PATHS = new Set(["/login", "/register"]);

// CSP for every response. 'unsafe-inline' is required by the Next.js App
// Router for its hydration scripts; tighten with nonces in a future phase.
// 'unsafe-eval' is for development only: React's dev build and Fast Refresh
// evaluate code; the production bundle doesn't.
const CSP = [
  "default-src 'self'",
  process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("Content-Security-Policy", CSP);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The BFF auth routes manage the cookies themselves; skip the session check.
  if (pathname.startsWith("/api/auth/")) {
    return addSecurityHeaders(NextResponse.next());
  }

  const isPublic = PUBLIC_PATHS.has(pathname);

  const accessToken = request.cookies.get(COOKIE_ACCESS)?.value;
  const refreshToken = request.cookies.get(COOKIE_REFRESH)?.value;

  // Happy path: a fresh access token. Signed-in users skip the auth pages.
  if (accessToken && isAccessTokenFresh(accessToken)) {
    if (isPublic) {
      return addSecurityHeaders(
        NextResponse.redirect(new URL("/", request.url))
      );
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // Access token expired or missing: try a silent refresh.
  if (refreshToken) {
    const refreshed = await refreshSession(
      process.env.API_URL ?? "http://localhost:4000",
      refreshToken
    );

    if (refreshed.kind === "ok") {
      const response = isPublic
        ? NextResponse.redirect(new URL("/", request.url))
        : NextResponse.next();
      response.cookies.set(
        COOKIE_ACCESS,
        refreshed.tokens.accessToken,
        accessCookieOpts()
      );
      response.cookies.set(
        COOKIE_REFRESH,
        refreshed.tokens.refreshToken,
        refreshCookieOpts()
      );
      return addSecurityHeaders(response);
    }

    // The api didn't answer (a redeploy, a network blip). The session may
    // well be alive, so keep the cookies: the next request retries. Clearing
    // them here would sign everyone out on every api restart.
    if (refreshed.kind === "unavailable") {
      return addSecurityHeaders(NextResponse.next());
    }

    // The refresh token is invalid or expired: clear the stale cookies.
    const response = isPublic
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set(COOKIE_ACCESS, "", clearCookieOpts());
    response.cookies.set(COOKIE_REFRESH, "", clearCookieOpts());
    return addSecurityHeaders(response);
  }

  // No tokens at all.
  if (isPublic) {
    return addSecurityHeaders(NextResponse.next());
  }
  return addSecurityHeaders(
    NextResponse.redirect(new URL("/login", request.url))
  );
}

export const config = {
  // Everything but build assets, icons, and robots.txt, which carry no data.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|robots.txt).*)",
  ],
};
