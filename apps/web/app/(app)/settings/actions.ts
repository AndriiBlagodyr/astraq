"use server";

import { revalidatePath } from "next/cache";
import { SessionIdParamSchema, UpdateAccountBodySchema } from "@astraq/shared";
import {
  type ActionResult,
  done,
  failed,
  failure,
  firstIssue,
} from "@/lib/action-result";
import { userApi } from "@/lib/api";

// The Settings writes, as server actions (docs/ui-plan.md § Settings):
// validated with the shared schemas before they reach the api, like the
// watchlist actions, and answering with the same `ActionResult`.

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
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const client = await userApi();
  const { response } = await client.PATCH("/api/me", { body: parsed.data });
  if (!response.ok) return failure(response, "Couldn't save the name");
  // The user menu in the layout shows the name too.
  revalidatePath("/", "layout");
  return done;
}

/** Signs one device out. Revoking the current session is the user's own sign-out. */
export async function revokeSession(id: string): Promise<ActionResult> {
  const parsed = SessionIdParamSchema.safeParse({ id });
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const client = await userApi();
  const { response } = await client.DELETE("/api/me/sessions/{id}", {
    params: { path: { id: parsed.data.id } },
  });
  if (!response.ok) return failure(response, "Couldn't sign that device out");
  revalidatePath("/settings/sessions");
  return done;
}
