import { cn } from "./cn";

/**
 * Styles shared by the listbox popups (Select, Combobox, Autocomplete), so
 * every "pick from a list" surface looks and moves the same.
 */
export const listbox = {
  positioner: "z-50 outline-none",
  popup: cn(
    "relative min-w-(--anchor-width) origin-(--transform-origin) overflow-hidden rounded-md border border-border-strong bg-surface-strong shadow-soft outline-none",
    // Glass surfaces are translucent; blur what's underneath so the list reads.
    "backdrop-blur-overlay",
    // Enter slides away from the trigger; exit fades in place, faster.
    "transition-[opacity,translate] duration-(--ds-motion-base) ease-out",
    "data-starting-style:opacity-0 data-ending-style:opacity-0",
    "data-starting-style:data-[side=bottom]:-translate-y-1.5 data-starting-style:data-[side=top]:translate-y-1.5",
    "data-ending-style:duration-(--ds-motion-fast) data-ending-style:ease-in",
  ),
  list: "max-h-[min(22rem,var(--available-height))] overflow-y-auto overscroll-contain p-1 outline-none data-empty:p-0",
  item: cn(
    "relative flex min-h-control-sm cursor-pointer items-center gap-2 rounded-sm py-2 pr-9 pl-3 text-sm text-secondary outline-none select-none",
    "transition-colors duration-(--ds-motion-fast)",
    "data-highlighted:bg-brand/10 data-highlighted:text-foreground",
    "data-selected:font-semibold data-selected:text-foreground",
    "data-disabled:pointer-events-none data-disabled:opacity-45",
  ),
  itemIndicator: "absolute right-3 inline-flex text-brand-fg",
  groupLabel: "px-3 pt-2 pb-1 text-xs font-semibold tracking-widest text-muted uppercase",
  separator: "-mx-1 my-1 h-px bg-border",
  empty: "px-3 py-4 text-sm text-muted empty:p-0",
  status: "px-3 py-2 text-xs text-muted empty:p-0",

  /**
   * Combobox / Autocomplete: the control surface moves to the group around
   * the input, so focus and invalid styles key off focus-within and the
   * group's data attributes (or an `aria-invalid` input outside a Field).
   */
  inputGroup: cn(
    "flex cursor-text items-center gap-1 pr-1.5",
    "focus-within:border-focus-ring focus-within:shadow-[0_0_0_3px_var(--ds-focus-halo)] focus-within:hover:border-focus-ring",
    "data-invalid:border-negative has-aria-invalid:border-negative",
    "data-invalid:focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ds-negative)_30%,transparent)] has-aria-invalid:focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ds-negative)_30%,transparent)]",
    "data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:border-border-strong",
  ),
  input:
    "min-w-0 flex-1 border-0 bg-transparent p-0 text-inherit outline-none placeholder:text-muted focus-visible:outline-none disabled:cursor-not-allowed",
  inputButton: cn(
    "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted",
    "transition-[color,background-color] duration-(--ds-motion-fast) ease-out",
    "hover:bg-surface-strong hover:text-foreground data-disabled:pointer-events-none",
    "[&_svg]:size-4",
  ),
  chip: cn(
    "inline-flex min-h-6 max-w-full items-center gap-1 rounded-sm bg-brand/12 py-0.5 pr-0.5 pl-2 text-xs font-semibold text-foreground outline-none",
    "transition-colors duration-(--ds-motion-fast)",
    "focus-within:bg-brand/24 data-highlighted:bg-brand/24",
  ),
  chipRemove: cn(
    "inline-flex size-5 cursor-pointer items-center justify-center rounded-sm text-secondary",
    "hover:bg-brand/18 hover:text-foreground [&_svg]:size-3.5",
  ),
};
