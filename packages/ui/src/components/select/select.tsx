"use client";

import type { ComponentProps } from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../lib/cn";
import { listbox } from "../../lib/listbox";
import { useFieldRequired } from "../field/field-context";
import { controlVariants, type ControlSize } from "../input/input";

// Keyboard: Space/Enter/ArrowDown open; arrows move, typing jumps to a match,
// Enter selects, Escape closes and returns focus. Provided by Base UI.
//
// Pass `items` (a value -> label map or `{ value, label }[]`) so the trigger
// shows the selected item's label. Without it, the raw value is shown.
//
// Inside a Field, FieldLabel names the trigger and FieldDescription /
// FieldError describe it. For typing to filter, use Combobox instead.
export function Select<Value, Multiple extends boolean | undefined = false>({
  required,
  ...props
}: SelectPrimitive.Root.Props<Value, Multiple>) {
  const fieldRequired = useFieldRequired();
  return (
    <SelectPrimitive.Root<Value, Multiple>
      required={required ?? fieldRequired}
      {...props}
    />
  );
}

export const SelectGroup = SelectPrimitive.Group;

export type SelectTriggerProps = Omit<
  ComponentProps<typeof SelectPrimitive.Trigger>,
  "className"
> & {
  className?: string;
  placeholder?: string;
  size?: ControlSize;
  /** Marks the control invalid outside a Field. Inside one, the Field decides. */
  invalid?: boolean;
};

export function SelectTrigger({
  className,
  placeholder,
  size,
  invalid,
  ...props
}: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      aria-invalid={invalid || undefined}
      className={cn(
        controlVariants({ size }),
        "group/select inline-flex cursor-pointer items-center justify-between gap-3 text-left",
        "data-placeholder:text-muted data-popup-open:border-focus-ring",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:border-border-strong",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Value className="truncate" placeholder={placeholder} />
      <SelectPrimitive.Icon
        render={
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted transition-transform duration-(--ds-motion-base) ease-out group-data-popup-open/select:rotate-180"
          />
        }
      />
    </SelectPrimitive.Trigger>
  );
}

const scrollArrowClassName =
  "flex h-7 w-full cursor-default items-center justify-center bg-surface-strong text-muted";

export type SelectContentProps = Omit<
  ComponentProps<typeof SelectPrimitive.Popup>,
  "className"
> & { className?: string };

export function SelectContent({
  className,
  children,
  ...props
}: SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        // Open below the trigger like a popover instead of overlapping it.
        alignItemWithTrigger={false}
        sideOffset={6}
        collisionPadding={8}
        className={listbox.positioner}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(listbox.popup, className)}
          {...props}
        >
          <SelectPrimitive.ScrollUpArrow
            className={cn(scrollArrowClassName, "top-0 z-10")}
          >
            <ChevronUp aria-hidden="true" className="size-4" />
          </SelectPrimitive.ScrollUpArrow>
          <SelectPrimitive.List className="max-h-(--available-height) scroll-py-7 overflow-y-auto p-1">
            {children}
          </SelectPrimitive.List>
          <SelectPrimitive.ScrollDownArrow
            className={cn(scrollArrowClassName, "bottom-0 z-10")}
          >
            <ChevronDown aria-hidden="true" className="size-4" />
          </SelectPrimitive.ScrollDownArrow>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

export type SelectItemProps = Omit<
  ComponentProps<typeof SelectPrimitive.Item>,
  "className"
> & { className?: string };

export function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(listbox.item, className)}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className={listbox.itemIndicator}>
        <Check aria-hidden="true" className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export type SelectLabelProps = Omit<
  ComponentProps<typeof SelectPrimitive.GroupLabel>,
  "className"
> & { className?: string };

/** Heading for a `SelectGroup`. */
export function SelectLabel({ className, ...props }: SelectLabelProps) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn(listbox.groupLabel, className)}
      {...props}
    />
  );
}

export type SelectSeparatorProps = Omit<
  ComponentProps<typeof SelectPrimitive.Separator>,
  "className"
> & { className?: string };

export function SelectSeparator({ className, ...props }: SelectSeparatorProps) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(listbox.separator, className)}
      {...props}
    />
  );
}
