"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button, FormField, Input } from "@astraq/ui";
import { createPortfolio } from "@/app/(app)/portfolios/actions";

/**
 * The index's "new portfolio" form: a server action as its action, so it
 * posts without JavaScript and, with it, shows the server's error under
 * the fields. Success redirects to the new portfolio.
 *
 * The trading costs are the fill model's (ADR 0008) and are set once: a
 * portfolio whose costs changed halfway couldn't be compared with itself.
 * Left empty, trading is free and orders have no size limit.
 */
export function CreatePortfolioForm() {
  const [state, action, pending] = useActionState(createPortfolio, null);

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name">
          <Input
            name="name"
            placeholder="Paper, Dividends, Ideas…"
            maxLength={64}
            autoComplete="off"
            required
          />
        </FormField>
        <FormField
          label="Starting cash"
          description="Paper money. You can deposit and withdraw later."
        >
          <Input
            name="startingCash"
            inputMode="decimal"
            defaultValue="10000"
            autoComplete="off"
            required
          />
        </FormField>
      </div>

      <fieldset className="m-0 grid gap-4 border-0 p-0 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-3 p-0 text-sm font-semibold text-secondary">
          Trading costs and limits, fixed once the portfolio exists
        </legend>
        <FormField
          label="Slippage (bps)"
          description="On market fills. 1 bp is 0.01%."
        >
          <Input
            name="slippageBps"
            inputMode="numeric"
            placeholder="0"
            autoComplete="off"
          />
        </FormField>
        <FormField label="Commission per order">
          <Input
            name="commissionPerOrder"
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
          />
        </FormField>
        <FormField label="Commission per share">
          <Input
            name="commissionPerShare"
            inputMode="decimal"
            placeholder="0.000"
            autoComplete="off"
          />
        </FormField>
        <FormField
          label="Largest order"
          description="An order over this is refused. Empty for no limit."
        >
          <Input
            name="maxOrderNotional"
            inputMode="decimal"
            placeholder="No limit"
            autoComplete="off"
          />
        </FormField>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>
          <Plus aria-hidden="true" />
          Create portfolio
        </Button>
        {state?.error ? (
          <p role="alert" className="m-0 text-sm text-negative-fg">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
