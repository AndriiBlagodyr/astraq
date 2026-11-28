import { unstable_rethrow } from "next/navigation";
import { fresh, requireSession, userApi } from "./api";
import type { ReviewAccess } from "./review-access";

// Server-side read of the review accounts. Server components only.

export type ReviewAccessRead =
  | { kind: "ok"; accounts: ReviewAccess[] }
  /** Not an admin: the api's ADMIN_EMAILS doesn't name this user. */
  | { kind: "forbidden" }
  /** The api didn't answer, or answered with a failure of its own. */
  | { kind: "unavailable" };

/**
 * The review accounts for whoever is signed in. Never throws, like
 * `getQueueStatus`: with the api down the page says so instead of landing
 * in the error boundary.
 */
export async function getReviewAccess(): Promise<ReviewAccessRead> {
  const api = await userApi();
  try {
    const { data, response } = await api.GET("/api/admin/access", fresh);
    requireSession(response);
    if (data) return { kind: "ok", accounts: data.accounts };
    return { kind: response.status === 403 ? "forbidden" : "unavailable" };
  } catch (error) {
    // `redirect` works by throwing; that one has to pass.
    unstable_rethrow(error);
    return { kind: "unavailable" };
  }
}
