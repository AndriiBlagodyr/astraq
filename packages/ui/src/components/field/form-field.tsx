"use client";

import type { ReactNode } from "react";
import { Field, FieldDescription, FieldError, FieldLabel, type FieldProps } from "./field";

export type FormFieldProps = FieldProps & {
  label: ReactNode;
  description?: ReactNode;
  /**
   * An error from your own validation or the server. Marks the field invalid
   * and always shows. Without it, the browser's validation message shows
   * when the control fails its constraints (`required`, `min`, `pattern`...).
   */
  error?: ReactNode;
};

/** The common case in one element: label, control, description, error. */
export function FormField({
  label,
  description,
  error,
  invalid,
  children,
  ...props
}: FormFieldProps) {
  const hasError = error != null && error !== false;
  return (
    <Field invalid={invalid ?? (hasError || undefined)} {...props}>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {hasError ? <FieldError match>{error}</FieldError> : <FieldError />}
    </Field>
  );
}
