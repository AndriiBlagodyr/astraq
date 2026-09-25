"use client";

import { createContext, useContext } from "react";

export type FieldContextValue = {
  controlId: string;
  descriptionId?: string;
  invalid: boolean;
  required: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

export const FieldProvider = FieldContext.Provider;

/**
 * Wiring for a control rendered inside FormField: its id, description, and
 * validation state. Returns null outside a FormField.
 */
export function useFieldControl() {
  return useContext(FieldContext);
}
