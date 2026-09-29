"use client";

import type { ComponentProps } from "react";
import { Fieldset as FieldsetPrimitive } from "@base-ui/react/fieldset";
import { cn } from "../../lib/cn";
import type { WithClassName } from "../../lib/types";

// One label for several controls: a checkbox or radio group, a range slider,
// or a section of a form. Compose it with a group via `render`:
// <Fieldset render={<RadioGroup />}>.

export type FieldsetProps = WithClassName<ComponentProps<typeof FieldsetPrimitive.Root>>;

export function Fieldset({ className, ...props }: FieldsetProps) {
  return (
    <FieldsetPrimitive.Root
      data-slot="fieldset"
      className={cn("m-0 grid min-w-0 gap-3 border-0 p-0", className)}
      {...props}
    />
  );
}

export type FieldsetLegendProps = WithClassName<
  ComponentProps<typeof FieldsetPrimitive.Legend>
>;

export function FieldsetLegend({ className, ...props }: FieldsetLegendProps) {
  return (
    <FieldsetPrimitive.Legend
      data-slot="fieldset-legend"
      className={cn(
        "text-sm font-semibold text-foreground data-disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
