"use client";

import type { ComponentProps } from "react";
import { CheckboxGroup as CheckboxGroupPrimitive } from "@base-ui/react/checkbox-group";
import { cn } from "../../lib/cn";
import type { WithClassName } from "../../lib/types";

// Shared state for a set of Checkboxes, keyed by each checkbox's `value`.
// For a select-all box, pass every value as `allValues` and render a
// <Checkbox parent />. Label the set with <Fieldset render={<CheckboxGroup />}>.

export type CheckboxGroupProps = WithClassName<
  ComponentProps<typeof CheckboxGroupPrimitive>
> & {
  orientation?: "vertical" | "horizontal";
};

export function CheckboxGroup({
  className,
  orientation = "vertical",
  ...props
}: CheckboxGroupProps) {
  return (
    <CheckboxGroupPrimitive
      data-slot="checkbox-group"
      data-orientation={orientation}
      className={cn(
        "flex gap-3",
        orientation === "vertical" ? "flex-col" : "flex-row flex-wrap gap-x-6",
        className,
      )}
      {...props}
    />
  );
}
