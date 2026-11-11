"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SessionIdParamSchema, UpdateAccountBodySchema } from "@astraq/shared";
import { z } from "zod";
import { problemDetail, userApi } from "@/lib/api";

// The Settings writes, as server actions (docs/ui-plan.md § Settings):
// validated with the shared schemas before they reach the api, like the
// watchlist actions.

export type ActionResult =
  | { ok: true; error: null }
  | { ok: false; error: string };

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

/**
 * The profile form's action (`useActionState`): sets or clears the display
 * name and reports the result under the field.
 */
export async function updateAccount(
  _previous: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = UpdateAccountBodySchema.safeParse({
    name: formData.get("name") ?? "",
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const client = await userApi();
  const { response } = await client.PATCH("/api/me", { body: parsed.data });
  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    return {
      ok: false,
      error: await problemDetail(response, "Couldn't save the name"),
    };
  }
  // The user menu in the layout shows the name too.
  revalidatePath("/", "layout");
  return { ok: true, error: null };
}

/** Signs one device out. Revoking the current session is the user's own sign-out. */
export async function revokeSession(id: string): Promise<ActionResult> {
  const parsed = SessionIdParamSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const client = await userApi();
  const { response } = await client.DELETE("/api/me/sessions/{id}", {
    params: { path: { id: parsed.data.id } },
  });
  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    return {
      ok: false,
      error: await problemDetail(response, "Couldn't sign that device out"),
    };
  }
  revalidatePath("/settings/sessions");
  return { ok: true, error: null };
}
