import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  accessCookieOpts,
  clearCookieOpts,
  isAccessTokenFresh,
  refreshCookieOpts,
} from "./lib/auth-cookies";

// Routes the browser may reach without an active session.
const PUBLIC_PATHS = new Set(["/login", "/register", "/forgot-password"]);

// CSP for every response. 'unsafe-inline' is required by Next.js App Router
// for its hydration scripts; tighten with nonces in a future phase.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
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

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

async function tryRefresh(refreshToken: string): Promise<RefreshResult | null> {
  const apiUrl = process.env.API_URL ?? "http://localhost:4000";
  try {
    const res = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    return (await res.json()) as RefreshResult;
  } catch {
    return null;
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // BFF auth routes handle their own logic; skip the session check.
  if (pathname.startsWith("/api/auth/")) {
    return addSecurityHeaders(NextResponse.next());
  }

  const isPublic = PUBLIC_PATHS.has(pathname);

  const accessToken = request.cookies.get(COOKIE_ACCESS)?.value;
  const refreshToken = request.cookies.get(COOKIE_REFRESH)?.value;

  // Happy path: fresh access token.
  if (accessToken && isAccessTokenFresh(accessToken)) {
    // Redirect authenticated users away from auth pages.
    if (isPublic) {
      return addSecurityHeaders(
        NextResponse.redirect(new URL("/", request.url))
      );
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // Access token expired or missing — try a silent refresh.
  if (refreshToken) {
    const refreshed = await tryRefresh(refreshToken);

    if (refreshed) {
      const response = isPublic
        ? NextResponse.redirect(new URL("/", request.url))
        : NextResponse.next();
      response.cookies.set(COOKIE_ACCESS, refreshed.accessToken, accessCookieOpts());
      response.cookies.set(COOKIE_REFRESH, refreshed.refreshToken, refreshCookieOpts());
      return addSecurityHeaders(response);
    }

    // Refresh token is invalid or expired — clear stale cookies.
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|robots.txt).*)",
  ],
};
