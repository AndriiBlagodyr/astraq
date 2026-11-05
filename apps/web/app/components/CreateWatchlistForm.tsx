"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button, FormField, Input } from "@astraq/ui";
import { createWatchlist } from "@/app/(app)/watchlists/actions";

/**
 * The index's "new watchlist" box: a form whose action is the server
 * action itself, so it posts without JavaScript and, with it, shows the
 * server's error under the field. Success redirects to the new list.
 */
export function CreateWatchlistForm() {
  const [state, action, pending] = useActionState(createWatchlist, null);

  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <FormField
        label="New watchlist"
        error={state?.error}
        className="min-w-[min(100%,16rem)] flex-1"
      >
        <Input
          name="name"
          placeholder="Tech, Dividends, Ideas…"
          maxLength={64}
          autoComplete="off"
          required
        />
      </FormField>
      {/* Aligned with the input, under the label's line. */}
      <Button type="submit" loading={pending} className="mt-6">
        <Plus aria-hidden="true" />
        Create
      </Button>
    </form>
  );
}
