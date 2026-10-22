"use client";

import type { ComponentProps } from "react";
import { Field as FieldPrimitive } from "@base-ui/react/field";
import { cn } from "../../lib/cn";
import { useFieldRequired } from "../field/field-context";
import { controlVariants } from "../input/input";

export type TextareaProps = Omit<ComponentProps<"textarea">, "className"> & {
  className?: string;
  /** Marks the control invalid outside a Field. Inside one, the Field decides. */
  invalid?: boolean;
  /** Grow with the content instead of scrolling (CSS `field-sizing`; fixed height where unsupported). */
  autoResize?: boolean;
};

export function Textarea({
  className,
  invalid,
  required,
  autoResize = false,
  ...props
}: TextareaProps) {
  const fieldRequired = useFieldRequired();
  return (
    // Field.Control rendering a <textarea> gets the same label, description,
    // and validity wiring as Input.
    <FieldPrimitive.Control
      render={<textarea />}
      data-slot="textarea"
      required={required ?? (fieldRequired || undefined)}
      aria-invalid={invalid || undefined}
      className={cn(
        controlVariants({ size: "md" }),
        "min-h-24 py-2.5 leading-6",
        autoResize ? "field-sizing-content resize-none" : "resize-y",
        className,
      )}
      {...(props as ComponentProps<typeof FieldPrimitive.Control>)}
    />
  );
}
