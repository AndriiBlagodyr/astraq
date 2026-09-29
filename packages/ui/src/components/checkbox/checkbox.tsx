"use client";

import type { ComponentProps } from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "../../lib/cn";
import type { WithClassName } from "../../lib/types";
import { useFieldRequired } from "../field/field-context";

/**
 * The box shared by Checkbox and Radio. Unchecked edges and the checked fill
 * are solved tokens (`border-control`, `bg-checked`) that clear 3:1 on every
 * surface, since they are the only thing that shows the control and its state.
 */
export const checkControlClassName = cn(
  "relative inline-flex size-5 shrink-0 cursor-pointer items-center justify-center border border-border-control bg-surface-muted text-on-checked",
  "transition-[background-color,border-color] duration-(--ds-motion-fast) ease-out",
  "hover:border-focus-ring",
  "data-checked:border-checked data-checked:bg-checked",
  "data-invalid:data-unchecked:border-negative",
  "data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:border-border-control",
  "data-readonly:cursor-default",
);

export type CheckboxProps = WithClassName<ComponentProps<typeof CheckboxPrimitive.Root>>;

/**
 * Label it by wrapping it in a `<label>` with its text, or with a
 * `FieldLabel` beside it inside a `FieldItem`. `indeterminate` shows the
 * mixed state; `parent` makes it the select-all box of a CheckboxGroup.
 */
export function Checkbox({ className, required, ...props }: CheckboxProps) {
  const fieldRequired = useFieldRequired();
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      required={required ?? (fieldRequired || undefined)}
      className={cn(
        checkControlClassName,
        // Half the theme's small radius: rounded, but never mistaken for a radio.
        "rounded-[calc(var(--ds-radius-sm)/2)]",
        "data-indeterminate:border-checked data-indeterminate:bg-checked",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={cn(
          "group/indicator flex",
          "transition-[opacity,scale] duration-(--ds-motion-fast) ease-out",
          "data-starting-style:scale-50 data-starting-style:opacity-0",
          "data-ending-style:scale-50 data-ending-style:opacity-0 data-ending-style:ease-in",
        )}
      >
        <Check
          aria-hidden="true"
          strokeWidth={3}
          className="size-3.5 group-data-indeterminate/indicator:hidden"
        />
        <Minus
          aria-hidden="true"
          strokeWidth={3}
          className="hidden size-3.5 group-data-indeterminate/indicator:block"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
