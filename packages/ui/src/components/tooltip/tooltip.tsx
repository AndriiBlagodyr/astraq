"use client";

import type { ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

// Opens on hover after a delay and immediately on keyboard focus; Escape
// dismisses. Moving between tooltips within the skip window opens instantly.
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={350} skipDelayDuration={250}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export type TooltipProps = {
  label: ReactNode;
  /** A single focusable element: tooltips must be reachable by keyboard. */
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
};

export function Tooltip({
  label,
  children,
  side = "top",
  align = "center",
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          data-slot="tooltip"
          side={side}
          align={align}
          sideOffset={7}
          collisionPadding={8}
          className={[
            "z-50 max-w-64 origin-(--radix-tooltip-content-transform-origin) rounded-sm border border-border-strong bg-surface-strong px-3 py-2 text-xs leading-5 text-balance text-foreground shadow-lg",
            // Enter slides away from the trigger; exit fades. `!` lets the exit
            // win over the side-based entry animation.
            "data-[side=bottom]:animate-ds-slide-down data-[side=left]:animate-ds-slide-left data-[side=right]:animate-ds-slide-right data-[side=top]:animate-ds-slide-up",
            "data-[state=closed]:animate-ds-fade-out! motion-reduce:animate-none!",
          ].join(" ")}
        >
          {label}
          <TooltipPrimitive.Arrow className="fill-[var(--ds-surface-strong)]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
