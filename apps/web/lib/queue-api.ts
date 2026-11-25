import { unstable_rethrow } from "next/navigation";
import { fresh, requireSession, userApi } from "./api";
import type { QueueStatus } from "./queue";

// Server-side read of the job queue. Server components only.

export type QueueRead =
  /** The signed-in user is an admin, and this is the queue. */
  | { kind: "ok"; status: QueueStatus }
  /** Not an admin: the api's ADMIN_EMAILS doesn't name this user. */
  | { kind: "forbidden" }
  /** An admin or not, the api (or its Redis) didn't answer. */
  | { kind: "unavailable" };

const TIMEOUT_MS = 3_000;

/**
 * The queue for whoever is signed in. Never throws: /status calls this for
 * every visitor to decide whether to show the queue at all, and has to
 * render while the api is down.
 */
export async function getQueueStatus(): Promise<QueueRead> {
  const api = await userApi();
  try {
    const { data, response } = await api.GET("/api/admin/queue", {
      ...fresh,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    requireSession(response);
    if (data) return { kind: "ok", status: data };
    return { kind: response.status === 403 ? "forbidden" : "unavailable" };
  } catch (error) {
    // `redirect` works by throwing; that one has to pass.
    unstable_rethrow(error);
    return { kind: "unavailable" };
  }
}
