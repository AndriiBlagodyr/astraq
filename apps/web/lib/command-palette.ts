import { appNavigation } from "./navigation";
import { type Shortcut, shortcuts } from "./shortcuts";

// What the ⌘K palette lists and how it ranks a query (motion plan "Command
// palette"). Pure: the component in app/components/CommandPalette.tsx only
// renders these groups and runs the chosen command.

export type PaletteGroupName = "Recent" | "Pages" | "Symbols" | "Actions";

export type PaletteAction =
  | "toggle-mode"
  | "next-theme"
  | "shortcuts"
  | "sign-out";

export type PaletteCommand = {
  /** Stable across renders and sessions; recents are stored by it. */
  id: string;
  label: string;
  /** Secondary text: a company name, what an action does. */
  hint?: string;
  /** Extra words a search may use ("dark", "light" for the mode toggle). */
  keywords?: readonly string[];
  href?: string;
  action?: PaletteAction;
  /** The keyboard shortcut that does the same thing, shown beside it. */
  shortcut?: Shortcut["keys"];
};

export type PaletteGroup = { value: PaletteGroupName; items: PaletteCommand[] };

/** A symbol as the palette needs it (a subset of the api's SymbolSummary). */
export type PaletteSymbol = { ticker: string; name: string };

export const pageCommands: readonly PaletteCommand[] = appNavigation.map(
  (item) => ({
    id: `page:${item.href}`,
    label: item.label,
    href: item.href,
    shortcut: shortcuts.find((shortcut) => shortcut.href === item.href)?.keys,
  })
);

export function actionCommands({
  mode,
  nextTheme,
}: {
  mode: "light" | "dark";
  nextTheme: string;
}): PaletteCommand[] {
  return [
    {
      id: "action:toggle-mode",
      label: `Switch to ${mode === "dark" ? "light" : "dark"} mode`,
      keywords: ["theme", "dark", "light", "appearance"],
      action: "toggle-mode",
    },
    {
      id: "action:next-theme",
      label: "Switch theme",
      hint: `Next: ${nextTheme}`,
      keywords: ["appearance", "colors", "palette"],
      action: "next-theme",
    },
    {
      id: "action:new-watchlist",
      label: "New watchlist",
      keywords: ["create", "list"],
      href: "/watchlists#new",
    },
    {
      id: "action:shortcuts",
      label: "Keyboard shortcuts",
      keywords: ["help", "keys"],
      action: "shortcuts",
      shortcut: ["?"],
    },
    {
      id: "action:sign-out",
      label: "Sign out",
      keywords: ["log out", "logout"],
      action: "sign-out",
    },
  ];
}

export function symbolCommand(symbol: PaletteSymbol): PaletteCommand {
  return {
    id: `symbol:${symbol.ticker}`,
    label: symbol.ticker,
    hint: symbol.name,
    href: `/stocks/${symbol.ticker}`,
  };
}

/**
 * How well `query` fits a command, or null when it doesn't. Hand-built
 * fuzzy matching: every query character must appear in order in the label
 * (or hint or keywords), and the score prefers a label prefix over a word
 * start, a word start over a run inside a word, and a run over scattered
 * letters. The scores only order results, so their size is arbitrary.
 */
export function matchScore(
  query: string,
  command: PaletteCommand
): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const label = command.label.toLowerCase();
  if (label.startsWith(q)) return 100;
  if (wordStarts(label).some((word) => word.startsWith(q))) return 80;
  if (label.includes(q)) return 60;

  const extra = [command.hint ?? "", ...(command.keywords ?? [])]
    .join(" ")
    .toLowerCase();
  if (extra) {
    if (wordStarts(extra).some((word) => word.startsWith(q))) return 50;
    if (extra.includes(q)) return 40;
  }

  const gaps = subsequenceGaps(q, label);
  if (gaps !== null) return Math.max(1, 30 - gaps);
  return null;
}

function wordStarts(text: string): string[] {
  return text.split(/[\s/:#-]+/).filter(Boolean);
}

/**
 * The number of skipped characters when `needle` is read in order out of
 * `haystack`, or null when it can't be. "nvd" in "nvidia corp" skips 3.
 */
function subsequenceGaps(needle: string, haystack: string): number | null {
  let gaps = 0;
  let position = 0;
  for (const char of needle) {
    const found = haystack.indexOf(char, position);
    if (found === -1) return null;
    gaps += found - position;
    position = found + 1;
  }
  return gaps;
}

/** The commands that match, best first; ties keep their order. */
export function rankCommands(
  query: string,
  commands: readonly PaletteCommand[]
): PaletteCommand[] {
  return commands
    .map((command, index) => ({
      command,
      index,
      score: matchScore(query, command),
    }))
    .filter(
      (entry): entry is typeof entry & { score: number } => entry.score !== null
    )
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.command);
}

export const RECENT_LIMIT = 6;

/**
 * `command` becomes the most recent item; a repeat moves up instead of
 * duplicating, and the list stays at `RECENT_LIMIT`. Only things you can
 * go back to are remembered: actions have nothing to reopen.
 */
export function rememberRecent(
  recent: readonly PaletteCommand[],
  command: PaletteCommand,
  limit = RECENT_LIMIT
): PaletteCommand[] {
  if (!command.href) return [...recent];
  const plain: PaletteCommand = { ...command };
  delete plain.shortcut;
  return [plain, ...recent.filter((item) => item.id !== command.id)].slice(
    0,
    limit
  );
}

/**
 * The groups the palette shows. Without a query: recent items first, then
 * every page and action. With one: each group filtered and ranked, the
 * symbols as the server returned them (it already matched them) minus any
 * that sit in Recent, and empty groups dropped.
 */
export function buildPaletteGroups({
  query,
  recent,
  symbols,
  actions,
  pages = pageCommands,
}: {
  query: string;
  recent: readonly PaletteCommand[];
  symbols: readonly PaletteSymbol[];
  actions: readonly PaletteCommand[];
  pages?: readonly PaletteCommand[];
}): PaletteGroup[] {
  const trimmed = query.trim();
  const groups: PaletteGroup[] = trimmed
    ? [
        { value: "Recent", items: rankCommands(trimmed, recent) },
        { value: "Pages", items: rankCommands(trimmed, pages) },
        {
          value: "Symbols",
          items: symbols
            .map(symbolCommand)
            .filter((symbol) => !recent.some((item) => item.id === symbol.id)),
        },
        { value: "Actions", items: rankCommands(trimmed, actions) },
      ]
    : [
        { value: "Recent", items: [...recent] },
        { value: "Pages", items: [...pages] },
        { value: "Actions", items: [...actions] },
      ];
  return groups.filter((group) => group.items.length > 0);
}
