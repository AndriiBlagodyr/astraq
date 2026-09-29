"use client";

import type { ComponentProps } from "react";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn } from "../../lib/cn";
import type { WithClassName } from "../../lib/types";
import { checkControlClassName } from "../checkbox/checkbox";
import { useFieldRequired } from "../field/field-context";

// Keyboard: Tab enters the group on the selected radio; arrow keys move and
// select, wrapping at the ends. Provided by Base UI. Label the group with
// <Fieldset render={<RadioGroup />}> and each Radio with a FieldItem.

export type RadioGroupProps = WithClassName<
  ComponentProps<typeof RadioGroupPrimitive>
> & {
  orientation?: "vertical" | "horizontal";
};

export function RadioGroup({
  className,
  orientation = "vertical",
  required,
  ...props
}: RadioGroupProps) {
  const fieldRequired = useFieldRequired();
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      aria-orientation={orientation}
      required={required ?? (fieldRequired || undefined)}
      className={cn(
        "flex gap-3",
        orientation === "vertical" ? "flex-col" : "flex-row flex-wrap gap-x-6",
        className,
      )}
      {...props}
    />
  );
}

export type RadioProps = WithClassName<ComponentProps<typeof RadioPrimitive.Root>>;

export function Radio({ className, ...props }: RadioProps) {
  return (
    <RadioPrimitive.Root
      data-slot="radio"
      className={cn(checkControlClassName, "rounded-full", className)}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-indicator"
        className={cn(
          "size-2 rounded-full bg-on-checked",
          "transition-[opacity,scale] duration-(--ds-motion-fast) ease-out",
          "data-starting-style:scale-0 data-ending-style:scale-0 data-ending-style:ease-in",
        )}
      />
    </RadioPrimitive.Root>
  );
}
