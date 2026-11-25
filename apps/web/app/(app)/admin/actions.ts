"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, failure } from "@/lib/action-result";
import { userApi } from "@/lib/api";

// The admin writes, as server actions. The api decides who is an admin
// (its ADMIN_EMAILS); a caller who isn't gets its 403 as the error.

/**
 * Puts every dead-lettered job back on the queue with all its attempts.
 * Answers with how many there were.
 */
export async function retryDeadJobs(): Promise<ActionResult<number>> {
  const client = await userApi();
  const { data, response } = await client.POST("/api/admin/queue/dead/retry");
  if (!data) return failure(response, "Couldn't put the jobs back");
  revalidatePath("/admin/queue");
  revalidatePath("/status");
  return { ok: true, value: data.retried };
}
