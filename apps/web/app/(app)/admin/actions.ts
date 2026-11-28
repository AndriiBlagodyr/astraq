"use server";

import { revalidatePath } from "next/cache";
import {
  CreateReviewAccessBodySchema,
  ReviewAccessIdParamSchema,
  UpdateReviewAccessBodySchema,
} from "@astraq/shared";
import {
  type ActionResult,
  done,
  failed,
  failure,
  firstIssue,
} from "@/lib/action-result";
import { userApi } from "@/lib/api";
import type { ReviewAccessCredentials } from "@/lib/review-access";

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

// Review accounts (/admin/access). Each answer that carries a password is
// the only time it exists in readable form, so it goes straight back to the
// component that shows it and is never revalidated into a page.

/** Makes a review account and answers with its one-time password. */
export async function createReviewAccess(input: {
  email: string;
  company: string;
  note: string;
  expiresAt: string;
  sharedCredentials: boolean;
}): Promise<ActionResult<ReviewAccessCredentials>> {
  const parsed = CreateReviewAccessBodySchema.safeParse(input);
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const client = await userApi();
  const { data, response } = await client.POST("/api/admin/access", {
    body: parsed.data,
  });
  if (!data) return failure(response, "Couldn't create the account");
  revalidatePath("/admin/access");
  return { ok: true, value: data };
}

/** Sets a new end date, which also reopens a closed account. */
export async function extendReviewAccess(
  id: string,
  expiresAt: string
): Promise<ActionResult> {
  const param = ReviewAccessIdParamSchema.safeParse({ id });
  const parsed = UpdateReviewAccessBodySchema.safeParse({ expiresAt });
  if (!param.success) return failed(firstIssue(param.error));
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const client = await userApi();
  const { response } = await client.PATCH("/api/admin/access/{id}", {
    params: { path: param.data },
    body: parsed.data,
  });
  if (!response.ok) return failure(response, "Couldn't change the end date");
  revalidatePath("/admin/access");
  return done;
}

/** Closes the account and signs it out everywhere. */
export async function revokeReviewAccess(id: string): Promise<ActionResult> {
  const param = ReviewAccessIdParamSchema.safeParse({ id });
  if (!param.success) return failed(firstIssue(param.error));

  const client = await userApi();
  const { response } = await client.POST("/api/admin/access/{id}/revoke", {
    params: { path: param.data },
  });
  if (!response.ok) return failure(response, "Couldn't revoke the account");
  revalidatePath("/admin/access");
  return done;
}

/** Gives the account a new one-time password and signs it out everywhere. */
export async function resetReviewAccessPassword(
  id: string
): Promise<ActionResult<ReviewAccessCredentials>> {
  const param = ReviewAccessIdParamSchema.safeParse({ id });
  if (!param.success) return failed(firstIssue(param.error));

  const client = await userApi();
  const { data, response } = await client.POST(
    "/api/admin/access/{id}/reset-password",
    { params: { path: param.data } }
  );
  if (!data) return failure(response, "Couldn't reset the password");
  revalidatePath("/admin/access");
  return { ok: true, value: data };
}
