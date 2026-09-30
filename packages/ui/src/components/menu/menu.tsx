"use client";

import type { ComponentProps } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";
import { popup } from "../../lib/popup";

// Keyboard: Enter/Space/ArrowDown open from the trigger. Arrows move, typing
// jumps to a match, Enter/Space activates, ArrowRight/Left open and close
// submenus, Escape closes and returns focus. Provided by Base UI.
//
// Every item part below also works inside a ContextMenu: Base UI builds the
// context menu from the same parts.
export const Menu = MenuPrimitive.Root;
export const MenuTrigger = MenuPrimitive.Trigger;
export const MenuGroup = MenuPrimitive.Group;
export const MenuRadioGroup = MenuPrimitive.RadioGroup;
export const MenuSub = MenuPrimitive.SubmenuRoot;

/** Shared by Menu and ContextMenu popups. */
export const menuPopupClassName = cn(
  popup.surface,
  popup.motion,
  "max-h-(--available-height) min-w-48 overflow-y-auto overscroll-contain p-1",
);

const itemBase = cn(
  "relative flex min-h-control-sm cursor-default items-center gap-2.5 rounded-sm px-3 py-1.5 text-sm text-secondary outline-none select-none",
  "transition-colors duration-(--ds-motion-fast)",
  // Direct children only: indicator icons keep their own color.
  "[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted",
  "data-highlighted:bg-brand/10 data-highlighted:text-foreground data-highlighted:[&>svg]:text-foreground",
  "data-disabled:pointer-events-none data-disabled:opacity-45",
);

const itemTone = {
  default: "",
  // Destructive actions read as such before they're highlighted.
  danger:
    "text-negative-fg [&>svg]:text-negative-fg data-highlighted:bg-negative/12 data-highlighted:text-negative-fg data-highlighted:[&>svg]:text-negative-fg",
};

// Checkbox and radio items reserve a gutter for their indicator. Pass `inset`
// to plain items in the same menu so labels line up.
const insetClassName = "pl-8";
const indicatorClassName =
  "absolute left-2 inline-flex size-4 items-center justify-center text-brand-fg [&_svg]:size-4";

export type MenuContentProps = Omit<
  ComponentProps<typeof MenuPrimitive.Popup>,
  "className"
> & {
  className?: string;
  /** Defaults to below the trigger; submenus default to the inline end. */
  side?: "top" | "right" | "bottom" | "left" | "inline-start" | "inline-end";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  alignOffset?: number;
};

export function MenuContent({
  className,
  side,
  align = "start",
  sideOffset = 6,
  alignOffset,
  ...props
}: MenuContentProps) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={8}
        className={popup.positioner}
      >
        <MenuPrimitive.Popup
          data-slot="menu"
          className={cn(menuPopupClassName, className)}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

/** A submenu's popup: overlaps the parent by its padding so items line up. */
export function MenuSubContent(props: MenuContentProps) {
  return <MenuContent sideOffset={-4} alignOffset={-4} {...props} />;
}

export type MenuItemProps = Omit<
  ComponentProps<typeof MenuPrimitive.Item>,
  "className"
> & {
  className?: string;
  tone?: keyof typeof itemTone;
  inset?: boolean;
};

export function MenuItem({
  className,
  tone = "default",
  inset,
  ...props
}: MenuItemProps) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      data-tone={tone}
      className={cn(itemBase, itemTone[tone], inset && insetClassName, className)}
      {...props}
    />
  );
}

export type MenuLinkItemProps = Omit<
  ComponentProps<typeof MenuPrimitive.LinkItem>,
  "className"
> & { className?: string; inset?: boolean };

/** Navigates like a link (`href`, middle-click, open in new tab). */
export function MenuLinkItem({ className, inset, ...props }: MenuLinkItemProps) {
  return (
    <MenuPrimitive.LinkItem
      data-slot="menu-item"
      className={cn(itemBase, "cursor-pointer", inset && insetClassName, className)}
      {...props}
    />
  );
}

export type MenuCheckboxItemProps = Omit<
  ComponentProps<typeof MenuPrimitive.CheckboxItem>,
  "className"
> & { className?: string };

export function MenuCheckboxItem({
  className,
  children,
  ...props
}: MenuCheckboxItemProps) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="menu-checkbox-item"
      className={cn(itemBase, insetClassName, className)}
      {...props}
    >
      <MenuPrimitive.CheckboxItemIndicator className={indicatorClassName}>
        <Check aria-hidden="true" />
      </MenuPrimitive.CheckboxItemIndicator>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

export type MenuRadioItemProps = Omit<
  ComponentProps<typeof MenuPrimitive.RadioItem>,
  "className"
> & { className?: string };

export function MenuRadioItem({
  className,
  children,
  ...props
}: MenuRadioItemProps) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="menu-radio-item"
      className={cn(itemBase, insetClassName, className)}
      {...props}
    >
      <MenuPrimitive.RadioItemIndicator className={indicatorClassName}>
        <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-fg" />
      </MenuPrimitive.RadioItemIndicator>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

export type MenuSubTriggerProps = Omit<
  ComponentProps<typeof MenuPrimitive.SubmenuTrigger>,
  "className"
> & { className?: string; inset?: boolean };

export function MenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuSubTriggerProps) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="menu-sub-trigger"
      className={cn(
        itemBase,
        "data-popup-open:bg-brand/10 data-popup-open:text-foreground",
        inset && insetClassName,
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRight aria-hidden="true" className="ml-auto rtl:rotate-180" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

export type MenuGroupLabelProps = Omit<
  ComponentProps<typeof MenuPrimitive.GroupLabel>,
  "className"
> & { className?: string };

/** Heading for a `MenuGroup` or `MenuRadioGroup`. */
export function MenuGroupLabel({ className, ...props }: MenuGroupLabelProps) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="menu-group-label"
      className={cn(
        "px-3 pt-2 pb-1 text-xs font-semibold tracking-widest text-muted uppercase",
        className,
      )}
      {...props}
    />
  );
}

export type MenuSeparatorProps = Omit<
  ComponentProps<typeof MenuPrimitive.Separator>,
  "className"
> & { className?: string };

export function MenuSeparator({ className, ...props }: MenuSeparatorProps) {
  return (
    <MenuPrimitive.Separator
      data-slot="menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

/**
 * A keyboard hint at the end of an item. Visual only: the shortcut itself is
 * the app's to register, and screen readers skip the hint.
 */
export function MenuShortcut({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="menu-shortcut"
      aria-hidden="true"
      className={cn(
        "ml-auto pl-4 font-mono text-xs tracking-wide text-muted",
        className,
      )}
      {...props}
    />
  );
}
