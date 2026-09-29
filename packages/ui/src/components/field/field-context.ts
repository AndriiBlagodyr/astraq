"use client";

import { createContext, useContext } from "react";

// Base UI's Field wires ids, labels, descriptions, and validity on its own.
// It has no notion of "required" at the field level, so this carries it from
// <Field required> to the label's asterisk and to the control, keeping both in
// sync from one prop.
const FieldRequiredContext = createContext(false);

export const FieldRequiredProvider = FieldRequiredContext.Provider;

/** Whether the enclosing `Field` is required. False outside a Field. */
export function useFieldRequired() {
  return useContext(FieldRequiredContext);
}
