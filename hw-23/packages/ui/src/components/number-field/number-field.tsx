"use client";

import type { ComponentProps } from "react";
import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field";
import { Minus, Plus } from "lucide-react";
import { cn } from "../../lib/cn";
import { listbox } from "../../lib/listbox";
import type { WithClassName } from "../../lib/types";
import { useFieldRequired } from "../field/field-context";
import { controlVariants, type ControlSize } from "../input/input";

// A numeric input with steppers. Keyboard: ArrowUp/Down step by `step`,
// Shift steps by `largeStep`, Alt by `smallStep`, Home/End jump to min/max.
// `format` takes Intl.NumberFormat options (currency, percent, digits) and
// parses what people type in that format. Provided by Base UI.
//
// The value is a JS number. Money stays Decimal: convert at the boundary
// (e.g. `new Decimal(value.toString())`) before it reaches domain code.

export type NumberFieldProps = WithClassName<
  ComponentProps<typeof NumberFieldPrimitive.Root>
> & {
  size?: ControlSize;
  /** Marks the control invalid outside a Field. Inside one, the Field decides. */
  invalid?: boolean;
  placeholder?: string;
  /** Name the input when no FieldLabel is present. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** Hide the -/+ buttons (the keyboard and wheel still step). */
  hideSteppers?: boolean;
};

export function NumberField({
  className,
  size,
  invalid,
  placeholder,
  required,
  hideSteppers = false,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: NumberFieldProps) {
  const fieldRequired = useFieldRequired();
  return (
    <NumberFieldPrimitive.Root
      data-slot="number-field"
      required={required ?? (fieldRequired || undefined)}
      className={cn("w-full", className)}
      {...props}
    >
      <NumberFieldPrimitive.Group
        className={cn(controlVariants({ size }), listbox.inputGroup, "pl-1.5")}
      >
        {hideSteppers ? null : (
          <NumberFieldPrimitive.Decrement aria-label="Decrease" className={listbox.inputButton}>
            <Minus aria-hidden="true" />
          </NumberFieldPrimitive.Decrement>
        )}
        <NumberFieldPrimitive.Input
          data-slot="number-field-input"
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-invalid={invalid || undefined}
          className={cn(
            listbox.input,
            "text-center tabular-nums",
            hideSteppers && "pl-1.5 text-left",
          )}
        />
        {hideSteppers ? null : (
          <NumberFieldPrimitive.Increment aria-label="Increase" className={listbox.inputButton}>
            <Plus aria-hidden="true" />
          </NumberFieldPrimitive.Increment>
        )}
      </NumberFieldPrimitive.Group>
    </NumberFieldPrimitive.Root>
  );
}
