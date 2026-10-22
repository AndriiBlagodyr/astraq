"use client";

import type { ComponentProps } from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";
import type { WithClassName } from "../../lib/types";
import { useFieldRequired } from "../field/field-context";

/**
 * The shared control surface: Input, Textarea, Select, Combobox,
 * Autocomplete, and NumberField all use it so they read as one family.
 */
export const controlVariants = cva(
  [
    "w-full rounded-md border border-border-strong bg-surface-muted text-foreground shadow-sm",
    "transition-[border-color,box-shadow,background-color] duration-(--ds-motion-fast) ease-out",
    // focus-ring is the brand color tuned for contrast per mode, so hover reads in light mode too.
    "placeholder:text-muted hover:border-focus-ring/50",
    // Border + soft ring instead of the global offset outline: it hugs the field.
    "focus-visible:border-focus-ring focus-visible:shadow-[0_0_0_3px_var(--ds-focus-halo)] focus-visible:outline-none",
    "aria-invalid:border-negative aria-invalid:hover:border-negative aria-invalid:focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ds-negative)_30%,transparent)]",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border-strong",
    // `:read-only` matches every non-editable element (buttons, divs), so it's
    // scoped to text inputs; groups and triggers carry Base UI's data-readonly.
    "[&:is(input,textarea):read-only]:bg-transparent [&:is(input,textarea):read-only]:hover:border-border-strong",
    "data-readonly:bg-transparent data-readonly:hover:border-border-strong",
  ],
  {
    variants: {
      size: {
        sm: "min-h-control-sm px-3 text-xs",
        md: "min-h-control-md px-inset-sm text-sm",
        lg: "min-h-control-lg px-inset-md text-base",
      },
    },
    defaultVariants: { size: "md" },
  },
);

/** The medium control surface. Kept for existing callers; prefer `controlVariants`. */
export const controlClassName = controlVariants();

export type ControlSize = NonNullable<VariantProps<typeof controlVariants>["size"]>;

export type InputProps = WithClassName<
  Omit<ComponentProps<typeof InputPrimitive>, "size">
> &
  VariantProps<typeof controlVariants> & {
    /** Marks the control invalid outside a Field. Inside one, the Field decides. */
    invalid?: boolean;
  };

export function Input({ className, size, invalid, required, ...props }: InputProps) {
  const fieldRequired = useFieldRequired();
  return (
    <InputPrimitive
      data-slot="input"
      required={required ?? (fieldRequired || undefined)}
      aria-invalid={invalid || undefined}
      className={cn(
        controlVariants({ size }),
        "file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
