"use client";

import { Search } from "lucide-react";
import { cn, controlVariants } from "@astraq/ui";
import { useCommandPalette } from "./CommandPalette";
import { ShortcutKeys } from "./ShortcutKeys";

/**
 * The top bar's search box, which is the command palette's trigger: it looks
 * like a field and opens the palette on click, `/`, or Mod+K (docs/ui-plan.md
 * § App shell). A button rather than an input, so focus lands in the palette
 * and the page never shows two search boxes.
 */
export function PaletteTrigger() {
  const { openPalette, apple } = useCommandPalette();

  return (
    <button
      type="button"
      onClick={openPalette}
      className={cn(
        controlVariants(),
        "flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left text-muted sm:max-w-80",
        "hover:text-secondary"
      )}
    >
      <Search aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        Search symbols, pages, actions…
      </span>
      <ShortcutKeys
        keys={["Mod", "k"]}
        apple={apple}
        className="hidden gap-0.5 sm:inline-flex"
      />
    </button>
  );
}
