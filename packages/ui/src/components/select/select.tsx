"use client";

import type { ComponentProps } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../lib/cn";
import { useFieldControl } from "../form-field/field-context";
import { controlClassName } from "../input/input";

// Keyboard: Space/Enter/ArrowDown open; arrows move, typing jumps to a match,
// Enter selects, Escape closes and returns focus. Provided by Radix.
export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;

export type SelectTriggerProps = ComponentProps<
  typeof SelectPrimitive.Trigger
> & {
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
        "data-placeholder:text-muted data-[state=open]:border-focus-ring",
        "[&>span:first-child]:truncate",
        className,
      )}
      {...props}
      aria-describedby={describedBy}
    >
      <SelectPrimitive.Value placeholder={placeholder} />
      <SelectPrimitive.Icon asChild>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted transition-transform duration-(--ds-motion-base) ease-out group-data-[state=open]/select:rotate-180"
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

const scrollButtonClassName =
  "flex h-7 cursor-default items-center justify-center text-muted";

export function SelectContent({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position="popper"
        sideOffset={6}
        collisionPadding={8}
        className={cn(
          "z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) origin-(--radix-select-content-transform-origin) overflow-hidden rounded-md border border-border-strong bg-surface-strong p-1 shadow-[var(--ds-shadow-soft)]",
          "data-[side=bottom]:animate-ds-slide-down data-[side=top]:animate-ds-slide-up motion-reduce:animate-none",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className={scrollButtonClassName}>
          <ChevronUp aria-hidden="true" className="size-4" />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className={scrollButtonClassName}>
          <ChevronDown aria-hidden="true" className="size-4" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-9 cursor-pointer items-center rounded-sm py-2 pr-9 pl-3 text-sm text-secondary outline-none select-none",
        "transition-colors duration-(--ds-motion-fast)",
        "data-highlighted:bg-brand/10 data-highlighted:text-foreground",
        "data-[state=checked]:font-semibold data-[state=checked]:text-foreground",
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

export function SelectLabel({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(
        "px-3 pt-2 pb-1 text-xs font-semibold tracking-widest text-muted uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function SelectSeparator({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}
