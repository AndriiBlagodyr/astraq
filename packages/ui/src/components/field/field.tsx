"use client";

import type { ComponentProps } from "react";
import { Field as FieldPrimitive } from "@base-ui/react/field";
import { cn } from "../../lib/cn";
import type { WithClassName } from "../../lib/types";
import { FieldRequiredProvider, useFieldRequired } from "./field-context";

// Base UI links the parts on its own: the label points at the control, and
// the description and any visible error join the control's
// aria-describedby. Every Base UI control in this package (Input, Checkbox,
// Select, NumberField, ...) reads the field's disabled and invalid state.

export type FieldProps = WithClassName<ComponentProps<typeof FieldPrimitive.Root>> & {
  /** Marks the label with an asterisk and makes the control required. */
  required?: boolean;
};

export function Field({ className, required = false, ...props }: FieldProps) {
  return (
    <FieldRequiredProvider value={required}>
      <FieldPrimitive.Root
        data-slot="field"
        className={cn("group/field grid content-start gap-2", className)}
        {...props}
      />
    </FieldRequiredProvider>
  );
}

export type FieldLabelProps = WithClassName<ComponentProps<typeof FieldPrimitive.Label>>;

export function FieldLabel({ className, children, ...props }: FieldLabelProps) {
  const required = useFieldRequired();
  return (
    <FieldPrimitive.Label
      data-slot="field-label"
      className={cn(
        "w-fit text-sm font-semibold text-foreground select-none",
        "data-disabled:cursor-not-allowed data-disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="ml-0.5 text-negative-fg">
          *
        </span>
      ) : null}
    </FieldPrimitive.Label>
  );
}

export type FieldDescriptionProps = WithClassName<
  ComponentProps<typeof FieldPrimitive.Description>
>;

export function FieldDescription({ className, ...props }: FieldDescriptionProps) {
  return (
    <FieldPrimitive.Description
      data-slot="field-description"
      className={cn("m-0 text-xs leading-5 text-muted", className)}
      {...props}
    />
  );
}

export type FieldErrorProps = WithClassName<ComponentProps<typeof FieldPrimitive.Error>>;

/**
 * Shows when the field is invalid. Without children it shows the browser's
 * validation message; `match` picks a specific validity state, and
 * `match={true}` always shows it (for errors from your own validation).
 */
export function FieldError({ className, ...props }: FieldErrorProps) {
  return (
    <FieldPrimitive.Error
      data-slot="field-error"
      role="alert"
      className={cn(
        "m-0 text-xs leading-5 font-medium text-negative-fg",
        "transition-[opacity,translate] duration-(--ds-motion-base) ease-out",
        "data-starting-style:-translate-y-0.5 data-starting-style:opacity-0",
        "data-ending-style:opacity-0 data-ending-style:duration-(--ds-motion-fast) data-ending-style:ease-in",
        className,
      )}
      {...props}
    />
  );
}

export type FieldItemProps = WithClassName<ComponentProps<typeof FieldPrimitive.Item>>;

/**
 * One option in a CheckboxGroup or RadioGroup, with its own label and
 * description. The control sits in the first column; text lines up beside it.
 * Like every Field part, it must sit inside a `Field`.
 */
export function FieldItem({ className, ...props }: FieldItemProps) {
  return (
    <FieldPrimitive.Item
      data-slot="field-item"
      className={cn(
        "grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5",
        "[&>[data-slot=field-description]]:col-start-2",
        className,
      )}
      {...props}
    />
  );
}

export const FieldValidity = FieldPrimitive.Validity;
