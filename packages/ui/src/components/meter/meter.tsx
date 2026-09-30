"use client";

import type { ComponentProps, ReactNode } from "react";
import { Meter as MeterPrimitive } from "@base-ui/react/meter";
import type { VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";
import {
  barHeaderClassName,
  barIndicatorVariants,
  barLabelClassName,
  barTrackVariants,
  barValueClassName,
} from "../progress/progress";

export type MeterProps = Omit<
  ComponentProps<typeof MeterPrimitive.Root>,
  "className" | "children"
> &
  VariantProps<typeof barTrackVariants> &
  VariantProps<typeof barIndicatorVariants> & {
    className?: string;
    /** Visible name. Without it, pass `aria-label`. */
    label?: ReactNode;
    /** Shows the formatted value beside the label. @default true */
    showValue?: boolean;
  };

/**
 * A measurement within a known range: buying power used, portfolio
 * concentration, storage. role="meter". Pick `tone` from the value (e.g.
 * "warning" past 80%): the component doesn't guess what's good or bad.
 * For a task in progress, use Progress.
 */
export function Meter({
  className,
  label,
  showValue = true,
  size,
  tone,
  ...props
}: MeterProps) {
  return (
    <MeterPrimitive.Root data-slot="meter" className={cn("w-full", className)} {...props}>
      {label || showValue ? (
        <div className={barHeaderClassName}>
          {label ? (
            <MeterPrimitive.Label className={barLabelClassName}>{label}</MeterPrimitive.Label>
          ) : (
            <span />
          )}
          {showValue ? <MeterPrimitive.Value className={barValueClassName} /> : null}
        </div>
      ) : null}
      <MeterPrimitive.Track className={barTrackVariants({ size })}>
        <MeterPrimitive.Indicator
          data-slot="meter-indicator"
          className={barIndicatorVariants({ tone })}
        />
      </MeterPrimitive.Track>
    </MeterPrimitive.Root>
  );
}
