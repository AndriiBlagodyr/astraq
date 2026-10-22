"use client";

import type { Ref } from "react";
import { Form as FormPrimitive } from "@base-ui/react/form";
import { cn } from "../../lib/cn";
import type { WithClassName } from "../../lib/types";

// A native <form> that runs its Fields' validation. `errors` takes server
// errors keyed by field name (clearing each once its value changes), and
// `onFormSubmit` receives the values as an object instead of FormData.
// `validationMode` sets when fields validate; each Field can override it.

type Values = Record<string, unknown>;

export type FormProps<V extends Values = Values> = WithClassName<FormPrimitive.Props<V>> & {
  ref?: Ref<HTMLFormElement>;
};

export function Form<V extends Values = Values>({ className, ...props }: FormProps<V>) {
  return (
    <FormPrimitive<V>
      data-slot="form"
      className={cn("grid gap-5", className)}
      {...props}
    />
  );
}
