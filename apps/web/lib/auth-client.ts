// The browser's calls to the BFF's auth routes (app/api/auth/*), in one
// place so every caller handles the same three outcomes: done, refused with
// the route's own message, and never arrived. `fetch` rejects when the
// network is down, and a rejection inside an event handler or a transition
// otherwise ends in the error boundary, or in nothing at all.

export type AuthPath = "login" | "register" | "logout" | "logout-all";

export type AuthOutcome =
  | { ok: true }
  /** `error` is the route's message; null when it gave none. */
  | { ok: false; error: string | null };

export const UNREACHABLE =
  "Can't reach the server. Check your connection and try again.";

export async function postAuth(
  path: AuthPath,
  body?: unknown
): Promise<AuthOutcome> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${path}`, {
      method: "POST",
      ...(body !== undefined && {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    });
  } catch {
    return { ok: false, error: UNREACHABLE };
  }
  if (response.ok) return { ok: true };
  const problem = (await response.json().catch(() => ({}))) as {
    error?: unknown;
  };
  return {
    ok: false,
    error: typeof problem.error === "string" ? problem.error : null,
  };
}
