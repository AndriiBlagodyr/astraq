import type { z } from "zod";
import { problemDetail, requireSession } from "./api";

// What every server action answers with, and the three steps they all share:
// name the first validation issue, send a signed-out caller to sign in, and
// turn the api's problem response into one line for a field or a toast.
// Server-side only (it reads the api's response); client components import
// the `ActionResult` type and nothing else.

export type ActionResult<T = null> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** A success that carries nothing back. */
export const done: ActionResult = { ok: true, value: null };

export function failed<T = null>(error: string): ActionResult<T> {
  return { ok: false, error };
}

/** Zod's first message, for a form field or a toast. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

/**
 * The failure for an api response that wasn't a success: the problem's own
 * detail, or `fallback`. A 401 means the session ended since the page
 * rendered, so the caller goes to sign in instead of reading an error.
 */
export async function failure<T = null>(
  response: Response,
  fallback: string
): Promise<ActionResult<T>> {
  requireSession(response);
  return failed(await problemDetail(response, fallback));
}
