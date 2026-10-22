"use client";

import type { ComponentProps } from "react";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import { cn } from "../../lib/cn";
import { popup } from "../../lib/popup";
import { menuPopupClassName } from "../menu/menu";

// Opens at the pointer on right-click or long-press, and from the keyboard
// with Shift+F10 or the Menu key while the trigger area has focus. Inside,
// it behaves exactly like Menu. Provided by Base UI.
//
// Fill it with the Menu item parts (MenuItem, MenuCheckboxItem, MenuSub, ...).
// A context menu is a shortcut: every action in it must also be reachable
// some other way, because touch and screen-reader users rarely find it.
export const ContextMenu = ContextMenuPrimitive.Root;

export type ContextMenuTriggerProps = Omit<
  ComponentProps<typeof ContextMenuPrimitive.Trigger>,
  "className"
> & { className?: string };

/** The area that responds to right-click. Make it focusable for keyboard users. */
export function ContextMenuTrigger({ className, ...props }: ContextMenuTriggerProps) {
  return (
    <ContextMenuPrimitive.Trigger
      data-slot="context-menu-trigger"
      className={cn("select-none", className)}
      {...props}
    />
  );
}

export type ContextMenuContentProps = Omit<
  ComponentProps<typeof ContextMenuPrimitive.Popup>,
  "className"
> & { className?: string };

export function ContextMenuContent({ className, ...props }: ContextMenuContentProps) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner
        collisionPadding={8}
        className={popup.positioner}
      >
        <ContextMenuPrimitive.Popup
          data-slot="context-menu"
          className={cn(menuPopupClassName, className)}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  );
}
