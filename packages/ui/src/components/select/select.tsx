"use client";

import type { ComponentProps } from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../lib/cn";
import { useFieldControl } from "../form-field/field-context";
import { controlClassName } from "../input/input";

// Keyboard: Space/Enter/ArrowDown open; arrows move, typing jumps to a match,
// Enter selects, Escape closes and returns focus. Provided by Base UI.
//
// Pass `items` (a value -> label map or `{ value, label }[]`) so the trigger
// shows the selected item's label. Without it, the raw value is shown.
export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;

export type SelectTriggerProps = Omit<
  ComponentProps<typeof SelectPrimitive.Trigger>,
  "className"
> & {
  className?: string;
  placeholder?: string;
  invalid?: boolean;
};

export function SelectTrigger({
  className,
  placeholder,
  invalid,
  ...props
}: SelectTriggerProps) {
  const field = useFieldControl();
  const isInvalid = invalid ?? field?.invalid;
  const describedBy =
    [field?.descriptionId, props["aria-describedby"]]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      id={field?.controlId}
      aria-invalid={isInvalid || undefined}
      className={cn(
        controlClassName,
        "group/select inline-flex cursor-pointer items-center justify-between gap-3 text-left",
        "data-placeholder:text-muted data-popup-open:border-focus-ring",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:border-border-strong",
        className,
      )}
      {...props}
      aria-describedby={describedBy}
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
        className="z-50 outline-none"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "relative min-w-(--anchor-width) origin-(--transform-origin) overflow-hidden rounded-md border border-border-strong bg-surface-strong shadow-soft outline-none",
            // Enter slides away from the trigger; exit fades in place.
            "transition-[opacity,translate] duration-(--ds-motion-base) ease-out",
            "data-starting-style:opacity-0 data-ending-style:opacity-0",
            "data-starting-style:data-[side=bottom]:-translate-y-1.5 data-starting-style:data-[side=top]:translate-y-1.5",
            "data-ending-style:duration-(--ds-motion-fast) data-ending-style:ease-in",
            className,
          )}
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
      className={cn(
        "relative flex min-h-9 cursor-pointer items-center rounded-sm py-2 pr-9 pl-3 text-sm text-secondary outline-none select-none",
        "transition-colors duration-(--ds-motion-fast)",
        "data-highlighted:bg-brand/10 data-highlighted:text-foreground",
        "data-selected:font-semibold data-selected:text-foreground",
        "data-disabled:pointer-events-none data-disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-3 inline-flex">
        <Check aria-hidden="true" className="size-4 text-brand-fg" />
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
      className={cn(
        "px-3 pt-2 pb-1 text-xs font-semibold tracking-widest text-muted uppercase",
        className,
      )}
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
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}
