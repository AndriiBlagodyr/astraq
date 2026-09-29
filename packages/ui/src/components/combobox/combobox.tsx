"use client";

import type { ComponentProps } from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { listbox } from "../../lib/listbox";
import type { WithClassName } from "../../lib/types";
import { useFieldRequired } from "../field/field-context";
import { controlVariants, type ControlSize } from "../input/input";

// Pick one value (or several, with `multiple`) from a list filtered by typing.
// Keyboard: typing filters and opens; ArrowUp/Down move, Enter selects,
// Escape closes (a second Escape clears). With chips, ArrowLeft from the
// start of the input moves to the chips and Backspace removes one. Provided
// by Base UI.
//
// Pass `items` and render the list with a function child:
// <ComboboxList>{(item) => <ComboboxItem value={item}>...</ComboboxItem>}</ComboboxList>.
// Object items need `itemToStringLabel` (what the input shows).

export function Combobox<Value, Multiple extends boolean | undefined = false, Item = Value>({
  required,
  ...props
}: ComboboxPrimitive.Root.Props<Value, Multiple, Item>) {
  const fieldRequired = useFieldRequired();
  return (
    <ComboboxPrimitive.Root<Value, Multiple, Item>
      required={required ?? fieldRequired}
      {...props}
    />
  );
}

type InputOptions = {
  size?: ControlSize;
  /** Marks the control invalid outside a Field. Inside one, the Field decides. */
  invalid?: boolean;
  /** Classes for the control surface around the input. */
  className?: string;
};

export type ComboboxInputProps = Omit<
  ComponentProps<typeof ComboboxPrimitive.Input>,
  "className" | "size"
> &
  InputOptions & {
    /** Show a button that clears the value. Default true. */
    clearable?: boolean;
  };

export function ComboboxInput({
  className,
  size,
  invalid,
  clearable = true,
  ...props
}: ComboboxInputProps) {
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-input-group"
      className={cn(controlVariants({ size }), listbox.inputGroup, className)}
    >
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        aria-invalid={invalid || undefined}
        className={listbox.input}
        {...props}
      />
      {clearable ? (
        <ComboboxPrimitive.Clear aria-label="Clear" className={listbox.inputButton}>
          <X aria-hidden="true" />
        </ComboboxPrimitive.Clear>
      ) : null}
      <ComboboxPrimitive.Trigger
        aria-label="Show options"
        className={cn(listbox.inputButton, "group/trigger")}
      >
        <ChevronDown
          aria-hidden="true"
          className="transition-transform duration-(--ds-motion-base) ease-out group-data-popup-open/trigger:rotate-180"
        />
      </ComboboxPrimitive.Trigger>
    </ComboboxPrimitive.InputGroup>
  );
}

export type ComboboxChipsInputProps<Value> = Omit<
  ComponentProps<typeof ComboboxPrimitive.Input>,
  "className" | "size" | "children"
> &
  InputOptions & {
    /** Chip text for a selected value. Defaults to `String(value)`. */
    chipLabel?: (value: Value) => string;
  };

/** The input for `multiple`: selected values sit as removable chips before it. */
export function ComboboxChipsInput<Value>({
  className,
  size,
  invalid,
  placeholder,
  chipLabel = String,
  ...props
}: ComboboxChipsInputProps<Value>) {
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-input-group"
      className={cn(
        controlVariants({ size }),
        listbox.inputGroup,
        "h-auto flex-wrap py-1.5 pl-1.5",
        className,
      )}
    >
      <ComboboxPrimitive.Value>
        {(values: Value[]) => (
          <ComboboxPrimitive.Chips
            data-slot="combobox-chips"
            className="flex min-w-0 flex-1 flex-wrap items-center gap-1"
            aria-label={values.length > 0 ? "Selected" : undefined}
          >
            {values.map((value) => {
              const label = chipLabel(value);
              return (
                <ComboboxPrimitive.Chip
                  key={label}
                  data-slot="combobox-chip"
                  className={listbox.chip}
                  aria-label={label}
                >
                  <span className="truncate">{label}</span>
                  <ComboboxPrimitive.ChipRemove
                    aria-label={`Remove ${label}`}
                    className={listbox.chipRemove}
                  >
                    <X aria-hidden="true" />
                  </ComboboxPrimitive.ChipRemove>
                </ComboboxPrimitive.Chip>
              );
            })}
            <ComboboxPrimitive.Input
              data-slot="combobox-input"
              aria-invalid={invalid || undefined}
              placeholder={values.length > 0 ? undefined : placeholder}
              className={cn(listbox.input, "min-h-6 min-w-16 pl-1.5")}
              {...props}
            />
          </ComboboxPrimitive.Chips>
        )}
      </ComboboxPrimitive.Value>
    </ComboboxPrimitive.InputGroup>
  );
}

export type ComboboxContentProps = WithClassName<
  ComponentProps<typeof ComboboxPrimitive.Popup>
>;

/** The popup: put ComboboxEmpty, ComboboxStatus, and ComboboxList inside. */
export function ComboboxContent({ className, ...props }: ComboboxContentProps) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        sideOffset={6}
        collisionPadding={8}
        className={listbox.positioner}
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(listbox.popup, "max-w-(--available-width)", className)}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

export type ComboboxListProps = WithClassName<ComponentProps<typeof ComboboxPrimitive.List>>;

export function ComboboxList({ className, ...props }: ComboboxListProps) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(listbox.list, className)}
      {...props}
    />
  );
}

export type ComboboxItemProps = WithClassName<ComponentProps<typeof ComboboxPrimitive.Item>>;

export function ComboboxItem({ className, children, ...props }: ComboboxItemProps) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(listbox.item, className)}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator className={listbox.itemIndicator}>
        <Check aria-hidden="true" className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

export type ComboboxEmptyProps = WithClassName<ComponentProps<typeof ComboboxPrimitive.Empty>>;

/** Shown in place of the list when nothing matches. */
export function ComboboxEmpty({ className, ...props }: ComboboxEmptyProps) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(listbox.empty, className)}
      {...props}
    />
  );
}

export type ComboboxStatusProps = WithClassName<
  ComponentProps<typeof ComboboxPrimitive.Status>
>;

/** Announced politely: "Searching...", "12 results". For async lists. */
export function ComboboxStatus({ className, ...props }: ComboboxStatusProps) {
  return (
    <ComboboxPrimitive.Status
      data-slot="combobox-status"
      className={cn(listbox.status, className)}
      {...props}
    />
  );
}

export const ComboboxGroup = ComboboxPrimitive.Group;
export const ComboboxCollection = ComboboxPrimitive.Collection;

export type ComboboxGroupLabelProps = WithClassName<
  ComponentProps<typeof ComboboxPrimitive.GroupLabel>
>;

export function ComboboxGroupLabel({ className, ...props }: ComboboxGroupLabelProps) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-group-label"
      className={cn(listbox.groupLabel, className)}
      {...props}
    />
  );
}

export type ComboboxSeparatorProps = WithClassName<
  ComponentProps<typeof ComboboxPrimitive.Separator>
>;

export function ComboboxSeparator({ className, ...props }: ComboboxSeparatorProps) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn(listbox.separator, className)}
      {...props}
    />
  );
}

/** Filtering helpers from Base UI: `useComboboxFilter()` returns locale-aware matchers. */
export const useComboboxFilter = ComboboxPrimitive.useFilter;
