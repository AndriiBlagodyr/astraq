"use client";

import type { ComponentProps } from "react";
import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import { listbox } from "../../lib/listbox";
import type { WithClassName } from "../../lib/types";
import { useFieldRequired } from "../field/field-context";
import { controlVariants, type ControlSize } from "../input/input";

// A text input with suggestions. Unlike Combobox, the value is whatever is
// typed: picking a suggestion fills the input, and free text is allowed
// (search boxes, symbol lookup). Keyboard: ArrowUp/Down move, Enter picks,
// Escape closes (a second Escape clears). Provided by Base UI.

export const Autocomplete = AutocompletePrimitive.Root;

export type AutocompleteInputProps = Omit<
  ComponentProps<typeof AutocompletePrimitive.Input>,
  "className" | "size"
> & {
  size?: ControlSize;
  /** Marks the control invalid outside a Field. Inside one, the Field decides. */
  invalid?: boolean;
  /** Classes for the control surface around the input. */
  className?: string;
  /** Show a button that clears the text. Default true. */
  clearable?: boolean;
};

export function AutocompleteInput({
  className,
  size,
  invalid,
  required,
  clearable = true,
  ...props
}: AutocompleteInputProps) {
  const fieldRequired = useFieldRequired();
  return (
    <AutocompletePrimitive.InputGroup
      data-slot="autocomplete-input-group"
      className={cn(controlVariants({ size }), listbox.inputGroup, className)}
    >
      <AutocompletePrimitive.Input
        data-slot="autocomplete-input"
        required={required ?? (fieldRequired || undefined)}
        aria-invalid={invalid || undefined}
        className={listbox.input}
        {...props}
      />
      {clearable ? (
        <AutocompletePrimitive.Clear aria-label="Clear" className={listbox.inputButton}>
          <X aria-hidden="true" />
        </AutocompletePrimitive.Clear>
      ) : null}
    </AutocompletePrimitive.InputGroup>
  );
}

export type AutocompleteContentProps = WithClassName<
  ComponentProps<typeof AutocompletePrimitive.Popup>
>;

export function AutocompleteContent({ className, ...props }: AutocompleteContentProps) {
  return (
    <AutocompletePrimitive.Portal>
      <AutocompletePrimitive.Positioner
        sideOffset={6}
        collisionPadding={8}
        className={listbox.positioner}
      >
        <AutocompletePrimitive.Popup
          data-slot="autocomplete-content"
          className={cn(listbox.popup, "max-w-(--available-width)", className)}
          {...props}
        />
      </AutocompletePrimitive.Positioner>
    </AutocompletePrimitive.Portal>
  );
}

export type AutocompleteListProps = WithClassName<
  ComponentProps<typeof AutocompletePrimitive.List>
>;

export function AutocompleteList({ className, ...props }: AutocompleteListProps) {
  return (
    <AutocompletePrimitive.List
      data-slot="autocomplete-list"
      className={cn(listbox.list, className)}
      {...props}
    />
  );
}

export type AutocompleteItemProps = WithClassName<
  ComponentProps<typeof AutocompletePrimitive.Item>
>;

export function AutocompleteItem({ className, ...props }: AutocompleteItemProps) {
  return (
    <AutocompletePrimitive.Item
      data-slot="autocomplete-item"
      // No selected state or check: a suggestion only fills the input.
      className={cn(listbox.item, "pr-3", className)}
      {...props}
    />
  );
}

export type AutocompleteEmptyProps = WithClassName<
  ComponentProps<typeof AutocompletePrimitive.Empty>
>;

export function AutocompleteEmpty({ className, ...props }: AutocompleteEmptyProps) {
  return (
    <AutocompletePrimitive.Empty
      data-slot="autocomplete-empty"
      className={cn(listbox.empty, className)}
      {...props}
    />
  );
}

export type AutocompleteStatusProps = WithClassName<
  ComponentProps<typeof AutocompletePrimitive.Status>
>;

export function AutocompleteStatus({ className, ...props }: AutocompleteStatusProps) {
  return (
    <AutocompletePrimitive.Status
      data-slot="autocomplete-status"
      className={cn(listbox.status, className)}
      {...props}
    />
  );
}

export const AutocompleteGroup = AutocompletePrimitive.Group;
export const AutocompleteCollection = AutocompletePrimitive.Collection;

export type AutocompleteGroupLabelProps = WithClassName<
  ComponentProps<typeof AutocompletePrimitive.GroupLabel>
>;

export function AutocompleteGroupLabel({ className, ...props }: AutocompleteGroupLabelProps) {
  return (
    <AutocompletePrimitive.GroupLabel
      data-slot="autocomplete-group-label"
      className={cn(listbox.groupLabel, className)}
      {...props}
    />
  );
}

export type AutocompleteSeparatorProps = WithClassName<
  ComponentProps<typeof AutocompletePrimitive.Separator>
>;

export function AutocompleteSeparator({ className, ...props }: AutocompleteSeparatorProps) {
  return (
    <AutocompletePrimitive.Separator
      data-slot="autocomplete-separator"
      className={cn(listbox.separator, className)}
      {...props}
    />
  );
}

export const useAutocompleteFilter = AutocompletePrimitive.useFilter;
