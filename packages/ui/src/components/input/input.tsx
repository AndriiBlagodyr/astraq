"use client";

import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { useFieldControl } from "../form-field/field-context";

/** Shared by every text-like control so they read as one family. */
export const controlClassName = cn(
  "min-h-11 w-full rounded-md border border-border-strong bg-surface-muted px-4 text-sm text-foreground shadow-sm",
  "transition-[border-color,box-shadow,background-color] duration-(--ds-motion-fast) ease-out",
  // focus-ring is the brand color tuned for contrast per mode, so hover reads in light mode too.
  "placeholder:text-muted hover:border-focus-ring/50",
  // Border + soft ring instead of the global offset outline: it hugs the field.
  "focus-visible:border-focus-ring focus-visible:shadow-[0_0_0_3px_var(--ds-focus)] focus-visible:outline-none",
  "aria-invalid:border-negative aria-invalid:hover:border-negative aria-invalid:focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ds-negative)_30%,transparent)]",
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border-strong",
  "read-only:bg-transparent read-only:hover:border-border-strong",
);

export type InputProps = ComponentProps<"input"> & {
  invalid?: boolean;
};

export function Input({ className, invalid, ...props }: InputProps) {
  const field = useFieldControl();
  const isInvalid = invalid ?? field?.invalid;
  const describedBy =
    [field?.descriptionId, props["aria-describedby"]]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <input
      data-slot="input"
      id={field?.controlId}
      required={field?.required || undefined}
      aria-invalid={isInvalid || undefined}
      className={cn(
        controlClassName,
        "file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground",
        className,
      )}
      {...props}
      aria-describedby={describedBy}
    />
  );
}
