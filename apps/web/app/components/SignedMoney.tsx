import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatSignedMoney } from "@/lib/format";
import { cashSign } from "@/lib/money";

/**
 * A gain or loss: signed, colored, and with an arrow, so the direction
 * never rests on color alone (docs/ui-plan.md § Shared patterns). Zero is
 * plain text; a missing figure is a dash.
 */
export function SignedMoney({ value }: { value: string | null }) {
  if (value === null) return <span className="text-muted">—</span>;
  const sign = cashSign(value);
  const Arrow = sign > 0 ? ArrowUpRight : sign < 0 ? ArrowDownRight : null;
  return (
    <span
      className={[
        "inline-flex items-center gap-0.5 tabular-nums",
        sign > 0 ? "text-positive-fg" : sign < 0 ? "text-negative-fg" : "",
      ].join(" ")}
    >
      {Arrow ? <Arrow aria-hidden="true" className="size-3.5" /> : null}
      {formatSignedMoney(value)}
    </span>
  );
}
