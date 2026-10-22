"use client";

import { useId, useState, type ReactElement, type ReactNode } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "../../lib/cn";
import { popup } from "../../lib/popup";
import { PopupArrow } from "../../lib/popup-arrow";

// Opens on hover after a delay and immediately on keyboard focus; Escape
// dismisses. Moving between tooltips within the timeout opens instantly.
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delay={350} timeout={250}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export type TooltipProps = {
  label: ReactNode;
  /** A single focusable element: tooltips must be reachable by keyboard. */
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
};

export function Tooltip({
  label,
  children,
  side = "top",
  align = "center",
}: TooltipProps) {
  // Base UI treats tooltips as visual-only. Ours carry supplementary
  // descriptions, so expose the text to assistive tech the way Radix did:
  // role="tooltip", referenced by aria-describedby while it's shown.
  const popupId = useId();
  const [open, setOpen] = useState(false);

  return (
    <TooltipPrimitive.Root onOpenChange={setOpen}>
      <TooltipPrimitive.Trigger
        render={children}
        aria-describedby={open ? popupId : undefined}
      />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner
          side={side}
          align={align}
          sideOffset={7}
          collisionPadding={8}
          className="z-50"
        >
          <TooltipPrimitive.Popup
            data-slot="tooltip"
            id={popupId}
            role="tooltip"
            className={cn(
              "max-w-64 origin-(--transform-origin) rounded-sm border border-border-strong bg-surface-strong px-3 py-2 text-xs leading-5 text-balance text-foreground shadow-lg",
              popup.motion,
              // Opening instantly (keyboard focus, or skipping between
              // tooltips) shouldn't wait on a transition.
              "data-instant:transition-none",
            )}
          >
            {label}
            <TooltipPrimitive.Arrow className={popup.arrow}>
              <PopupArrow />
            </TooltipPrimitive.Arrow>
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
