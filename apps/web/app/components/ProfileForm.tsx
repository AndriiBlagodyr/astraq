"use client";

import { useActionState } from "react";
import { Button, FormField, Input } from "@astraq/ui";
import { updateAccount } from "@/app/(app)/settings/actions";

/**
 * The profile form: a server action as its action, so it posts without
 * JavaScript and, with it, reports under the field. The email is shown,
 * not edited, until verification exists (Phase 7).
 */
export function ProfileForm({
  email,
  name,
}: {
  email: string;
  name: string | null;
}) {
  const [state, action, pending] = useActionState(updateAccount, null);

  return (
    <form action={action} className="grid max-w-md gap-4">
      <FormField
        label="Email"
        description="Read-only until email verification exists."
      >
        <Input type="email" value={email} readOnly />
      </FormField>
      <FormField
        label="Display name"
        description="Shown in the user menu. Leave it empty to use your email."
        error={state && !state.ok ? state.error : undefined}
      >
        <Input
          name="name"
          defaultValue={name ?? ""}
          maxLength={80}
          autoComplete="name"
          placeholder="Your name"
        />
      </FormField>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          Save
        </Button>
        {state?.ok ? (
          <p role="status" className="m-0 text-sm text-positive-fg">
            Saved.
          </p>
        ) : null}
      </div>
    </form>
  );
}
