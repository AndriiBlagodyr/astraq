"use client";

import type { ComponentProps } from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "../../lib/cn";
import type { WithClassName } from "../../lib/types";

// A row of Toggles sharing one value array. Single by default (pressing one
// releases the others, and pressing it again releases it); `multiple` lets
// several stay pressed. Arrow keys move between toggles, wrapping (Base UI).
//
// When exactly one option must always be chosen, use SegmentedControl.

export type ToggleGroupProps = WithClassName<ComponentProps<typeof ToggleGroupPrimitive>>;

export function ToggleGroup({ className, ...props }: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn(
        "inline-flex items-center gap-1 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        className,
      )}
      {...props}
    />
  );
}
