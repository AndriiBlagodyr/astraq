"use client";

import type { ComponentProps } from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "../../lib/cn";
import type { WithClassName } from "../../lib/types";
import { useFieldRequired } from "../field/field-context";

// An on/off setting that applies immediately. For a choice submitted with a
// form ("I agree to the terms"), prefer Checkbox. Space toggles (Base UI).

export type SwitchProps = WithClassName<ComponentProps<typeof SwitchPrimitive.Root>>;

export function Switch({ className, required, ...props }: SwitchProps) {
  const fieldRequired = useFieldRequired();
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      required={required ?? (fieldRequired || undefined)}
      className={cn(
        "group/switch relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-pill border border-border-control bg-surface-muted",
        // The thumb sits 4px from every outer edge whatever the theme's border
        // width, so its 16px travel (translate-x-4) lands symmetric.
        "px-[calc(0.25rem-var(--ds-border-width))]",
        "transition-[background-color,border-color] duration-(--ds-motion-fast) ease-out",
        "hover:border-focus-ring",
        "data-checked:border-checked data-checked:bg-checked",
        "data-invalid:data-unchecked:border-negative",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:border-border-control",
        "data-readonly:cursor-default",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // fg-muted clears text contrast on every surface, so the off thumb reads.
          "block size-4 rounded-pill bg-secondary shadow-sm",
          "transition-[translate,background-color,scale] duration-(--ds-motion-base) ease-out",
          "data-checked:translate-x-4 data-checked:bg-on-checked",
          "motion-safe:group-active/switch:scale-90",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
