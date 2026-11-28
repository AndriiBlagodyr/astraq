"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Feedback, FormField, PasswordInput } from "@astraq/ui";
import { postAuth } from "@/lib/auth-client";
import { changePassword } from "./actions";

/**
 * Current password, a new one, and the new one again. A server action is
 * its action, so the passwords travel in a POST body. Success redirects
 * into the app with a new session.
 */
export function ChangePasswordForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(changePassword, null);
  const [leaving, startLeaving] = useTransition();

  function signOut() {
    startLeaving(async () => {
      await postAuth("logout");
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <form action={action} className="grid gap-4">
      <FormField
        label="Current password"
        description="The one you just signed in with."
      >
        <PasswordInput
          name="currentPassword"
          autoComplete="current-password"
          required
        />
      </FormField>

      <FormField label="New password" description="At least 12 characters.">
        <PasswordInput
          name="newPassword"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </FormField>

      <FormField label="New password again">
        <PasswordInput
          name="confirmPassword"
          autoComplete="new-password"
          required
        />
      </FormField>

      {state && !state.ok ? (
        <Feedback
          tone="danger"
          title="Password not changed"
          description={state.error}
        />
      ) : null}

      <Button type="submit" loading={pending} className="w-full">
        Change password
      </Button>

      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
        <Button
          variant="secondary"
          size="sm"
          loading={leaving}
          onClick={signOut}
        >
          Sign out
        </Button>
      </footer>
    </form>
  );
}
