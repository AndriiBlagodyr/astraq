"use client";

import { useMemo, type ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { FieldProvider, type FieldContextValue } from "./field-context";

export type FormFieldProps = ComponentProps<"div"> & {
  label: string;
  /** Id of the control inside. Also used to derive the description id. */
  htmlFor: string;
  hint?: string;
  /** Replaces the hint and marks the control invalid. */
  error?: string;
  required?: boolean;
};

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  className,
  children,
  ...props
}: FormFieldProps) {
  const description = error ?? hint;
  const descriptionId = description ? `${htmlFor}-description` : undefined;

  const field = useMemo<FieldContextValue>(
    () => ({
      controlId: htmlFor,
      descriptionId,
      invalid: Boolean(error),
      required,
    }),
    [htmlFor, descriptionId, error, required],
  );

  return (
    <div
      data-slot="form-field"
      data-invalid={error ? true : undefined}
      className={cn("group/field grid gap-2", className)}
      {...props}
    >
      <label
        htmlFor={htmlFor}
        className="w-fit text-sm font-semibold text-foreground group-has-disabled/field:opacity-60"
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-negative-fg">
            *
          </span>
        ) : null}
      </label>
      <FieldProvider value={field}>{children}</FieldProvider>
      {description ? (
        <p
          id={descriptionId}
          className={cn(
            "m-0 text-xs leading-5 text-muted",
            error && "text-negative-fg",
          )}
          role={error ? "alert" : undefined}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
