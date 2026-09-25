import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

export const badgeVariants = cva(
  "inline-flex min-h-7 w-fit items-center gap-1.5 rounded-full border px-3 text-xs font-semibold tracking-wide whitespace-nowrap tabular-nums [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-border-strong bg-surface-muted text-secondary",
        brand: "border-brand/25 bg-brand/10 text-brand-fg",
        positive: "border-positive/25 bg-positive/10 text-positive-fg",
        negative: "border-negative/25 bg-negative/10 text-negative-fg",
        warning: "border-warning/25 bg-warning/10 text-warning-fg",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeProps = ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    />
  );
}
