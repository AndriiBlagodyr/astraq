import type { ComponentProps, ReactNode } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

export const statValueVariants = cva(
  "m-0 font-display font-bold tracking-tight text-foreground tabular-nums",
  {
    variants: {
      size: { sm: "text-lg", md: "text-2xl", lg: "text-4xl" },
    },
    defaultVariants: { size: "md" },
  },
);

const deltaTone = {
  neutral: "text-secondary",
  positive: "text-positive-fg",
  negative: "text-negative-fg",
  warning: "text-warning-fg",
};

const trendIcon = { up: ArrowUpRight, down: ArrowDownRight, flat: ArrowRight };

export type StatProps = Omit<ComponentProps<"dl">, "children"> &
  VariantProps<typeof statValueVariants> & {
    label: ReactNode;
    /** The figure. Format it before passing, or pass an AnimatedNumber. */
    value: ReactNode;
    /** The change beside the value. Keep the sign in the text ("+2.4%"): the arrow is decorative. */
    delta?: ReactNode;
    /** Which way the delta points. Sets only the arrow. */
    trend?: "up" | "down" | "flat";
    /** Whether the change is good or bad. Sets only the color. @default "neutral" */
    tone?: keyof typeof deltaTone;
    /** Context under the value: "vs. last month", "as of 16:00". */
    description?: ReactNode;
  };

/**
 * A labelled figure with an optional change: total return, win rate, jobs
 * run. Generic, with no market semantics: `trend` (direction) and `tone`
 * (good or bad) are separate, because a drawdown going down is good news.
 *
 * Renders a `<dl>`, so the label and value stay paired for screen readers.
 * Safe in Server Components.
 */
export function Stat({
  label,
  value,
  delta,
  trend,
  tone = "neutral",
  description,
  size,
  className,
  ...props
}: StatProps) {
  const TrendIcon = trend ? trendIcon[trend] : null;

  return (
    // A flat grid, not wrapper divs: inside a <dl>, a div may only wrap dt+dd groups.
    <dl
      data-slot="stat"
      className={cn("m-0 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1", className)}
      {...props}
    >
      <dt className="col-span-2 text-xs font-semibold tracking-widest text-muted uppercase">
        {label}
      </dt>
      <dd className={cn(statValueVariants({ size }), !delta && "col-span-2")}>{value}</dd>
      {delta ? (
        <dd
          data-slot="stat-delta"
          data-tone={tone}
          className={cn(
            "m-0 inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums",
            deltaTone[tone],
          )}
        >
          {TrendIcon ? <TrendIcon aria-hidden="true" className="size-4 shrink-0" /> : null}
          {delta}
        </dd>
      ) : null}
      {description ? <dd className="col-span-2 m-0 text-sm text-secondary">{description}</dd> : null}
    </dl>
  );
}
