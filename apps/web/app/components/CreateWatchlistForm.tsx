"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { Button, FormField, Input } from "@astraq/ui";
import { createWatchlist } from "@/app/(app)/watchlists/actions";

/**
 * The index's "new watchlist" box: a form whose action is the server
 * action itself, so it posts without JavaScript and, with it, shows the
 * server's error under the field. Success redirects to the new list.
 * Opened as `/watchlists#new` (the palette's "New watchlist"), the name
 * field takes focus.
 */
export function CreateWatchlistForm() {
  const [state, action, pending] = useActionState(createWatchlist, null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.location.hash === "#new") nameRef.current?.focus();
  }, []);

  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <FormField
        label="New watchlist"
        error={state?.error}
        className="min-w-[min(100%,16rem)] flex-1"
      >
        <Input
          ref={nameRef}
          id="new"
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
