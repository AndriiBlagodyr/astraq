"use client";

import { useActionState } from "react";
import { Button, FormField, Input } from "@astraq/ui";
import { transferCash } from "@/app/(app)/portfolios/actions";

/**
 * Paper cash in or out of a portfolio: one amount and two submit buttons,
 * each carrying its own `type`, so the form needs no JavaScript to know
 * which was pressed. The server's refusal (a withdrawal the cash doesn't
 * cover) shows under the field; on success the page re-renders with the
 * new balance and React clears the field.
 */
export function CashTransferForm({ portfolioId }: { portfolioId: string }) {
  const [state, action, pending] = useActionState(transferCash, null);

  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="id" value={portfolioId} />
      <FormField
        label="Move cash"
        error={state && !state.ok ? state.error : undefined}
        className="min-w-[min(100%,12rem)] flex-1 sm:max-w-56"
      >
        <Input
          name="amount"
          inputMode="decimal"
          placeholder="1,000.00"
          autoComplete="off"
          required
        />
      </FormField>
      {/* Aligned with the input, under the label's line. */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button type="submit" name="type" value="deposit" disabled={pending}>
          Deposit
        </Button>
        <Button
          type="submit"
          name="type"
          value="withdrawal"
          variant="secondary"
          disabled={pending}
        >
          Withdraw
        </Button>
        {state?.ok ? (
          <p role="status" className="m-0 text-sm text-positive-fg">
            Done.
          </p>
        ) : null}
      </div>
    </form>
  );
}
