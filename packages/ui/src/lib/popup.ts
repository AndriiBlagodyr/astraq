import { cn } from "./cn";

/**
 * Styles shared by anchored popups (Popover, Menu, ContextMenu, PreviewCard),
 * so every floating surface looks and moves the same. Listbox popups keep
 * their own set in `listbox.ts`.
 */
export const popup = {
  positioner: "z-50 outline-none",
  surface: cn(
    "origin-(--transform-origin) rounded-md border border-border-strong bg-surface-strong text-foreground shadow-soft outline-none",
    // Glass surfaces are translucent; blur what's underneath so content reads.
    "backdrop-blur-overlay",
  ),
  /**
   * Enter slides away from the anchor on whichever side the popup landed;
   * exit fades in place, faster. Durations are 0ms under reduced motion.
   */
  motion: cn(
    "transition-[opacity,translate] duration-(--ds-motion-base) ease-out",
    "data-starting-style:opacity-0 data-ending-style:opacity-0",
    "data-starting-style:data-[side=bottom]:-translate-y-1.5 data-starting-style:data-[side=top]:translate-y-1.5",
    "data-starting-style:data-[side=left]:translate-x-1.5 data-starting-style:data-[side=right]:-translate-x-1.5",
    "data-starting-style:data-[side=inline-end]:-translate-x-1.5 data-starting-style:data-[side=inline-start]:translate-x-1.5",
    "data-ending-style:duration-(--ds-motion-fast) data-ending-style:ease-in",
  ),
  /** Positions `PopupArrow` on each side; the SVG points up by default. */
  arrow: cn(
    "data-[side=bottom]:-top-2 data-[side=top]:-bottom-2 data-[side=top]:rotate-180",
    "data-[side=left]:-right-3 data-[side=left]:rotate-90 data-[side=right]:-left-3 data-[side=right]:-rotate-90",
  ),
};
