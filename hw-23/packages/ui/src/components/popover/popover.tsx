"use client";

import type { ComponentProps } from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "../../lib/cn";
import { popup } from "../../lib/popup";
import { PopupArrow } from "../../lib/popup-arrow";

// Keyboard: the trigger opens on Enter/Space and focus moves into the popup.
// Tab moves through its content; Escape or clicking outside closes and
// returns focus to the trigger. Provided by Base UI.
//
// Popovers hold interactive content (filters, a quick order form). For a
// plain description, use Tooltip; for a list of actions, use Menu.
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

export type PopoverContentProps = Omit<
  ComponentProps<typeof PopoverPrimitive.Popup>,
  "className"
> & {
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  /** Draws an arrow pointing at the trigger. */
  arrow?: boolean;
};

export function PopoverContent({
  className,
  side = "bottom",
  align = "center",
  sideOffset,
  arrow = false,
  children,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset ?? (arrow ? 10 : 6)}
        collisionPadding={8}
        className={popup.positioner}
      >
        <PopoverPrimitive.Popup
          data-slot="popover"
          className={cn(
            popup.surface,
            popup.motion,
            "w-72 max-w-(--available-width) p-4 text-sm",
            className,
          )}
          {...props}
        >
          {children}
          {arrow ? (
            <PopoverPrimitive.Arrow className={popup.arrow}>
              <PopupArrow />
            </PopoverPrimitive.Arrow>
          ) : null}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export type PopoverTitleProps = Omit<
  ComponentProps<typeof PopoverPrimitive.Title>,
  "className"
> & { className?: string };

/** Names the popup: Base UI points its `aria-labelledby` here. */
export function PopoverTitle({ className, ...props }: PopoverTitleProps) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn("m-0 text-sm font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export type PopoverDescriptionProps = Omit<
  ComponentProps<typeof PopoverPrimitive.Description>,
  "className"
> & { className?: string };

export function PopoverDescription({
  className,
  ...props
}: PopoverDescriptionProps) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn("mt-1 mb-0 text-sm leading-6 text-secondary", className)}
      {...props}
    />
  );
}
