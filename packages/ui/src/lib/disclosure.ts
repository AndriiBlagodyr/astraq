import { cn } from "./cn";

/**
 * Styles shared by the disclosure panels (Accordion, Collapsible).
 *
 * The panel's height is never animated (motion rule 4: no layout
 * properties). It opens at full height and its content fades and settles
 * down into place; it closes instantly, since dismissals should feel
 * immediate. With no exit transition, Base UI unmounts it right away.
 */
export const disclosure = {
  panel: cn(
    "overflow-hidden",
    "transition-[opacity,translate] duration-(--ds-motion-base) ease-out",
    "data-starting-style:-translate-y-1 data-starting-style:opacity-0",
    "data-ending-style:transition-none",
    // Keep `hidden="until-found"` panels findable by in-page search.
    "[&[hidden]:not([hidden='until-found'])]:hidden",
  ),
  /** The chevron: rotates with the trigger's `data-panel-open`. */
  chevron:
    "size-4 shrink-0 text-muted transition-[rotate] duration-(--ds-motion-base) ease-out group-data-panel-open:rotate-180",
};
