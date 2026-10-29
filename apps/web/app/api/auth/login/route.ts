import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  accessCookieOpts,
  refreshCookieOpts,
} from "@/lib/auth-cookies";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface Problem {
  detail?: string;
  title?: string;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const upstream = await fetch(`${env.API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const problem = (await upstream.json().catch(() => ({}))) as Problem;
    return NextResponse.json(
      { error: problem.detail ?? problem.title ?? "Sign-in failed" },
      { status: upstream.status }
    );
  }

  const tokens = (await upstream.json()) as AuthTokens;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_ACCESS, tokens.accessToken, accessCookieOpts());
  res.cookies.set(COOKIE_REFRESH, tokens.refreshToken, refreshCookieOpts());
  return res;
}
