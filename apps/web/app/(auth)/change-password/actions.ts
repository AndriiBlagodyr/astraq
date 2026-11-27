"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChangePasswordBodySchema } from "@astraq/shared";
import {
  type ActionResult,
  failed,
  failure,
  firstIssue,
} from "@/lib/action-result";
import { userApi } from "@/lib/api";
import { setAuthCookies } from "@/lib/auth-cookies";

/**
 * The change-password form's action (`useActionState`). The api ends every
 * session of the account and answers with a new one, so the new token pair
 * replaces the cookies here; without that the browser would be signed out
 * by its own password change.
 */
export async function changePassword(
  _previous: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword !== String(formData.get("confirmPassword") ?? "")) {
    return failed("The two new passwords don't match");
  }
  const parsed = ChangePasswordBodySchema.safeParse({
    currentPassword: formData.get("currentPassword") ?? "",
    newPassword,
  });
  if (!parsed.success) {
    return failed(
      parsed.error.issues[0]?.path[0] === "newPassword"
        ? "The new password needs 12 to 128 characters"
        : firstIssue(parsed.error)
    );
  }

  const client = await userApi();
  const { data, response } = await client.POST("/api/auth/password", {
    body: parsed.data,
  });
  if (!data) {
    if (response.status === 429) {
      return failed("Too many attempts. Please wait before trying again.");
    }
    return failure(response, "Couldn't change the password");
  }

  setAuthCookies({ cookies: await cookies() }, data);
  redirect("/");
}
