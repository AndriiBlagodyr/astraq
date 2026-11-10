// The sidebar grows with the roadmap: an item appears in the phase that gives
// it real data (docs/ui-plan.md § Navigation). Groups (Markets, Trading,
// Research) return once they have an item. `key` is the letter after `g` that
// jumps to the page (lib/shortcuts.ts); it also feeds the command palette.
export const appNavigation = [
  { href: "/", label: "Today", key: "t" },
  { href: "/watchlists", label: "Watchlists", key: "w" },
  { href: "/stocks", label: "Stocks", key: "s" },
  // Points at the one analysis view until Phase 6 adds the /analysis index.
  { href: "/analysis/returns", label: "Analysis", key: "a" },
  { href: "/status", label: "Status", key: "u" },
] as const;

export type NavigationItem = (typeof appNavigation)[number];
