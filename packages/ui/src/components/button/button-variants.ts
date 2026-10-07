import { cva } from "class-variance-authority";

// Kept apart from button.tsx, which is a client module: server components call
// buttonVariants() to style links as buttons, and a function exported from a
// "use client" file reaches the server only as a client reference.
export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-pill border font-semibold whitespace-nowrap select-none",
    "transition-[translate,scale,background-color,border-color,color,box-shadow,filter,opacity] duration-(--ds-motion-fast) ease-out",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    // Hover lifts, press sinks. Transforms only when motion is allowed.
    "motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[0.98]",
    // `disabled` for native buttons, `aria-disabled` for links and loading
    // buttons that must stay focusable.
    "disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none",
    "aria-disabled:pointer-events-none aria-disabled:opacity-45 aria-disabled:shadow-none",
    // Loading keeps full opacity: the spinner is the signal, not a faded button.
    "data-loading:aria-disabled:opacity-100",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-[image:var(--ds-gradient-brand)] text-on-brand shadow-brand hover:brightness-110 active:brightness-95",
        secondary:
          "border-border-strong bg-surface-muted text-foreground hover:border-focus-ring/70 hover:bg-surface active:bg-surface-strong",
        ghost:
          "border-transparent bg-transparent text-secondary hover:bg-surface-muted hover:text-foreground active:bg-surface-strong",
        danger:
          "border-negative/35 bg-negative/12 text-negative-fg hover:border-negative/55 hover:bg-negative/18 active:bg-negative/24",
      },
      size: {
        sm: "min-h-control-sm px-inset-sm text-xs [&_svg:not([class*='size-'])]:size-3.5",
        md: "min-h-control-md px-inset-md text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "min-h-control-lg px-inset-lg text-base [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);
