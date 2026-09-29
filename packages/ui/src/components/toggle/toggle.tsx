"use client";

import type { ComponentProps } from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";
import type { WithClassName } from "../../lib/types";

export const toggleVariants = cva(
  [
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border font-semibold whitespace-nowrap text-secondary select-none",
    "transition-[background-color,border-color,color,scale] duration-(--ds-motion-fast) ease-out",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "hover:bg-surface-muted hover:text-foreground motion-safe:active:scale-[0.97]",
    // Pressed shows by a solved edge, not only a tint, so it clears 3:1.
    "data-pressed:border-checked data-pressed:bg-brand/12 data-pressed:text-foreground",
    "data-disabled:cursor-not-allowed data-disabled:opacity-45 data-disabled:hover:bg-transparent data-disabled:hover:text-secondary",
  ],
  {
    variants: {
      variant: {
        ghost: "border-transparent bg-transparent",
        outline: "border-border-strong bg-transparent",
      },
      size: {
        sm: "min-h-control-sm min-w-control-sm px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        md: "min-h-control-md min-w-control-md px-3 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "min-h-control-lg min-w-control-lg px-4 text-base [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

export type ToggleProps = WithClassName<ComponentProps<typeof TogglePrimitive>> &
  VariantProps<typeof toggleVariants>;

/**
 * A button that stays pressed (`aria-pressed`): bold, show grid, log scale.
 * Icon-only toggles need an `aria-label`. Inside a ToggleGroup, give each a `value`.
 */
export function Toggle({ className, variant, size, ...props }: ToggleProps) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size }), className)}
      {...props}
    />
  );
}
