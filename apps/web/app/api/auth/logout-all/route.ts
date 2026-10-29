import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { COOKIE_ACCESS, COOKIE_REFRESH, clearCookieOpts } from "@/lib/auth-cookies";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(COOKIE_ACCESS)?.value;

  if (accessToken) {
    await fetch(`${env.API_URL}/api/auth/logout-all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => undefined);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_ACCESS, "", clearCookieOpts());
  res.cookies.set(COOKIE_REFRESH, "", clearCookieOpts());
  return res;
}
