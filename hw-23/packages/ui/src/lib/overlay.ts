import { cn } from "./cn";

// Exits are shorter than entries so dismissals feel immediate. Durations read
// motion tokens, which drop to 0ms under prefers-reduced-motion.
const exitTiming =
  "data-ending-style:duration-(--ds-motion-fast) data-ending-style:ease-in";

/** Styles shared by modal overlays: Dialog, AlertDialog, Drawer. */
export const overlay = {
  exitTiming,
  backdrop: cn(
    "fixed inset-0 z-50 bg-overlay backdrop-blur-overlay",
    "transition-opacity duration-(--ds-motion-base) ease-out",
    "data-starting-style:opacity-0 data-ending-style:opacity-0",
    exitTiming,
  ),
  /** A centered modal card; set the width per component. */
  dialog: cn(
    "fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-xl border border-border-strong bg-surface-strong p-6 shadow-soft outline-none",
    "transition-[opacity,scale] duration-(--ds-motion-base) ease-out",
    "data-starting-style:scale-96 data-starting-style:opacity-0 data-ending-style:scale-96 data-ending-style:opacity-0",
    exitTiming,
  ),
  title: "m-0 font-display text-xl font-bold text-balance text-foreground",
  description: "mt-2 mb-0 text-sm leading-6 text-pretty text-secondary",
  /** Right-aligned action row; stacks on narrow screens with the primary action first. */
  footer: "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end",
};
