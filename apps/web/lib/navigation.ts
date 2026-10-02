// The sidebar grows with the roadmap: an item appears in the phase that gives
// it real data (docs/ui-plan.md § Navigation). Groups (Markets, Trading,
// Research) return once they have an item.
export const appNavigation = [
  { href: "/", label: "Today" },
  { href: "/status", label: "Status" },
] as const;
