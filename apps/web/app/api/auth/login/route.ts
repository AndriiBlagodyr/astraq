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

  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const clientIp = forwardedFor ?? realIp;

  const upstream = await fetch(`${env.API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(clientIp ? { "X-Forwarded-For": clientIp } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    if (upstream.status === 429) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please wait before trying again." },
        { status: 429 }
      );
    }
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
