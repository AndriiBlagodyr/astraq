import { createApiClient } from "@astraq/sdk";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_ACCESS } from "./auth-cookies";
import { bffHeaders, clientIpFrom } from "./bff-headers";
import { env } from "./env";

/**
 * The web's one client for apps/api, typed by the generated SDK. Server
 * components, server actions, and route handlers only: `API_URL` is a
 * server value (see lib/env.ts), and only the BFF talks to the api.
 */
export const api = keepingProblems(createApiClient(env.API_URL));

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
  return keepingProblems(
    createApiClient(env.API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    })
  );
}

// The SDK client reads a failed response's body itself (into `error`), and
// a body can be read once: `response.json()` afterwards throws. So each
// client parses a copy of every failed response first and files it here,
// where `problemDetail` finds it by the response it's handed.
const problems = new WeakMap<Response, unknown>();

function keepingProblems<Client extends ReturnType<typeof createApiClient>>(
  client: Client
): Client {
  client.use({
    // Every call names the browser it is made for, so the api's rate limits
    // count per user and not per web server (lib/bff-headers.ts).
    async onRequest({ request }) {
      const vouched = bffHeaders(clientIpFrom(await headers()));
      for (const [name, value] of Object.entries(vouched)) {
        request.headers.set(name, value);
      }
      return request;
    },
    async onResponse({ response }) {
      if (!response.ok) {
        problems.set(
          response,
          await response
            .clone()
            .json()
            .catch(() => undefined)
        );
      }
      return undefined;
    },
  });
  return client;
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
  const problem = (problems.get(response) ??
    (await response.json().catch(() => undefined)) ??
    {}) as { detail?: unknown; title?: unknown };
  if (typeof problem.detail === "string" && problem.detail) {
    return problem.detail;
  }
  if (typeof problem.title === "string" && problem.title) return problem.title;
  return fallback;
}
