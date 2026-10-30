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

  const upstream = await fetch(`${env.API_URL}/api/auth/register`, {
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
        { error: "Too many registration attempts. Please wait before trying again." },
        { status: 429 }
      );
    }
    const problem = (await upstream.json().catch(() => ({}))) as Problem;
    // 409 = invite-only rejection or email already registered. Return a
    // consistent message so the response doesn't reveal which emails exist.
    const message =
      upstream.status === 409
        ? "Registration is currently invite-only."
        : (problem.detail ?? problem.title ?? "Registration failed");
    return NextResponse.json({ error: message }, { status: upstream.status });
  }

  const tokens = (await upstream.json()) as AuthTokens;
  const res = NextResponse.json({ ok: true }, { status: 201 });
  res.cookies.set(COOKIE_ACCESS, tokens.accessToken, accessCookieOpts());
  res.cookies.set(COOKIE_REFRESH, tokens.refreshToken, refreshCookieOpts());
  return res;
}
