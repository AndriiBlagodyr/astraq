"use client";

import { useState } from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/cn";
import { listbox } from "../../lib/listbox";
import { useFieldRequired } from "../field/field-context";
import { controlVariants, type InputProps } from "./input";

export type PasswordInputProps = Omit<InputProps, "type"> & {
  /** Show the password as text at first. Default false. */
  defaultVisible?: boolean;
};

/**
 * A password input with a button at its end that shows the typed text and
 * hides it again. The button keeps focus in the input on a mouse press, so
 * the caret stays where it was.
 */
export function PasswordInput({
  className,
  size,
  invalid,
  required,
  disabled,
  defaultVisible = false,
  ...props
}: PasswordInputProps) {
  const fieldRequired = useFieldRequired();
  const [visible, setVisible] = useState(defaultVisible);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div
      data-slot="password-input-group"
      data-disabled={disabled ? "" : undefined}
      className={cn(controlVariants({ size }), listbox.inputGroup, className)}
    >
      <InputPrimitive
        data-slot="password-input"
        type={visible ? "text" : "password"}
        required={required ?? (fieldRequired || undefined)}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        // Shown as text, the value must still not be corrected or capitalized.
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={listbox.input}
        {...props}
      />
      <button
        type="button"
        data-slot="password-input-toggle"
        aria-label={visible ? "Hide password" : "Show password"}
        disabled={disabled}
        data-disabled={disabled ? "" : undefined}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setVisible((current) => !current)}
        className={listbox.inputButton}
      >
        <Icon aria-hidden="true" />
      </button>
    </div>
  );
}
