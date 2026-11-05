import { createApiClient } from "@astraq/sdk";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_ACCESS } from "./auth-cookies";
import { env } from "./env";

/**
 * The web's one client for apps/api, typed by the generated SDK. Server
 * components, server actions, and route handlers only: `API_URL` is a
 * server value (see lib/env.ts), and only the BFF talks to the api.
 */
export const api = createApiClient(env.API_URL);

/**
 * The api as the signed-in user: the same client with the session's access
 * token as a Bearer header. It reads the request's cookies, so it works in
 * server components and server actions only. proxy.ts refreshes an expiring
 * token before a request gets here, so no cookie means no session, and the
 * caller is sent to sign in.
 */
export async function userApi() {
  const token = (await cookies()).get(COOKIE_ACCESS)?.value;
  if (!token) redirect("/login");
  return createApiClient(env.API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Data pages render per request; a cached read would hide a bootstrap run. */
export const fresh = { cache: "no-store" } as const;

/** An api call that failed in a way the page can't show: rendered by error.tsx. */
export function apiFailure(what: string, status: number): Error {
  return new Error(`${what} failed with HTTP ${status}`);
}

/**
 * The human-readable part of an RFC 9457 problem response (the api's error
 * format, see apps/api/src/common/problem.ts), or `fallback`.
 */
export async function problemDetail(
  response: Response,
  fallback: string
): Promise<string> {
  const problem = (await response.json().catch(() => ({}))) as {
    detail?: string;
    title?: string;
  };
  return problem.detail ?? problem.title ?? fallback;
}
