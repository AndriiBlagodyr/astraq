"use client";

import type { ComponentProps, ReactNode } from "react";
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

/**
 * Bar styles shared by Progress and Meter. Fills use tokens solved for 3:1
 * against every surface (`checked`, and the `*-fg` tone colors), so the bar
 * reads in all themes, not just the raw brand hue.
 */
export const barTrackVariants = cva("relative w-full overflow-hidden rounded-pill bg-border", {
  variants: {
    size: { sm: "h-1", md: "h-1.5", lg: "h-2.5" },
  },
  defaultVariants: { size: "md" },
});

export const barIndicatorVariants = cva(
  "block h-full rounded-pill transition-[width] duration-(--ds-motion-base) ease-out",
  {
    variants: {
      tone: {
        brand: "bg-checked",
        positive: "bg-positive-fg",
        warning: "bg-warning-fg",
        negative: "bg-negative-fg",
      },
    },
    defaultVariants: { tone: "brand" },
  },
);

export const barHeaderClassName = "mb-2 flex items-baseline justify-between gap-3 text-sm";
export const barLabelClassName = "font-medium text-foreground";
export const barValueClassName = "text-secondary tabular-nums";

export type ProgressProps = Omit<
  ComponentProps<typeof ProgressPrimitive.Root>,
  "className" | "children"
> &
  VariantProps<typeof barTrackVariants> &
  VariantProps<typeof barIndicatorVariants> & {
    className?: string;
    /** Visible name. Without it, pass `aria-label`. */
    label?: ReactNode;
    /** Shows the formatted value (e.g. "40%") beside the label. */
    showValue?: boolean;
  };

/**
 * How far a task has got: a backtest run, an import. `value={null}` means
 * indeterminate: the bar sweeps and the value is omitted. For a static
 * measurement within a range (buying power used), use Meter.
 */
export function Progress({
  className,
  label,
  showValue = false,
  size,
  tone,
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root data-slot="progress" className={cn("w-full", className)} {...props}>
      {label || showValue ? (
        <div className={barHeaderClassName}>
          {label ? (
            <ProgressPrimitive.Label className={barLabelClassName}>{label}</ProgressPrimitive.Label>
          ) : (
            <span />
          )}
          {showValue ? <ProgressPrimitive.Value className={barValueClassName} /> : null}
        </div>
      ) : null}
      <ProgressPrimitive.Track className={barTrackVariants({ size })}>
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn(
            barIndicatorVariants({ tone }),
            // Indeterminate sweeps; it keeps moving under reduced motion
            // because it's the only sign of activity, just slower.
            "data-indeterminate:w-2/5 data-indeterminate:animate-[ds-progress-sweep_1.4s_ease-in-out_infinite]",
            "motion-reduce:data-indeterminate:animate-[ds-progress-sweep_2.8s_ease-in-out_infinite]",
          )}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}
