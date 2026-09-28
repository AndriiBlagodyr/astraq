"use client";

import { useId, useState, type ReactElement, type ReactNode } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "../../lib/cn";

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
              // Enter slides away from the trigger; exit fades in place.
              "transition-[opacity,translate] duration-(--ds-motion-base) ease-out",
              "data-starting-style:opacity-0 data-ending-style:opacity-0",
              "data-starting-style:data-[side=bottom]:-translate-y-1.5 data-starting-style:data-[side=top]:translate-y-1.5",
              "data-starting-style:data-[side=left]:translate-x-1.5 data-starting-style:data-[side=right]:-translate-x-1.5",
              "data-ending-style:duration-(--ds-motion-fast) data-ending-style:ease-in",
              // Opening instantly (keyboard focus, or skipping between
              // tooltips) shouldn't wait on a transition.
              "data-instant:transition-none",
            )}
          >
            {label}
            <TooltipPrimitive.Arrow className="data-[side=bottom]:-top-2 data-[side=left]:-right-3 data-[side=left]:rotate-90 data-[side=right]:-left-3 data-[side=right]:-rotate-90 data-[side=top]:-bottom-2 data-[side=top]:rotate-180">
              <ArrowSvg />
            </TooltipPrimitive.Arrow>
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

// Base UI positions the arrow but doesn't draw it. Points up by default; the
// Arrow rotates it per side. The stroke matches the popup's border.
function ArrowSvg() {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden="true">
      <path
        d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
        className="fill-surface-strong"
      />
      <path
        d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.89 7.00001L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.77734 7.00001L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
        className="fill-border-strong"
      />
    </svg>
  );
}
