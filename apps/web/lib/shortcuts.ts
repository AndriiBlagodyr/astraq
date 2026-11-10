import { appNavigation } from "./navigation";

// The app's keyboard shortcuts (docs/ui-plan.md § App shell, motion plan
// "Keyboard shortcuts"). This file is the one list: the global listener,
// the `?` overlay, and the command palette all read it. Pure, so the matcher
// is unit-tested without a DOM.

/** "Mod" is ⌘ on Apple platforms and Ctrl elsewhere. */
export type ShortcutKey = "Mod" | "Shift" | string;

export type Shortcut = {
  id: string;
  /** Keys pressed in sequence (`["g", "s"]`) or together (`["Mod", "k"]`). */
  keys: readonly ShortcutKey[];
  /** Pressed together, as a chord, instead of one after another. */
  chord?: boolean;
  label: string;
  /** Where the shortcut goes, when it navigates. */
  href?: string;
  /** What it does otherwise, handled by the shell. */
  action?: "palette" | "shortcuts";
  group: "Navigate" | "Go to page";
};

export const shortcuts: readonly Shortcut[] = [
  {
    id: "palette",
    keys: ["Mod", "k"],
    chord: true,
    label: "Open the command palette",
    action: "palette",
    group: "Navigate",
  },
  {
    id: "search",
    keys: ["/"],
    label: "Search symbols",
    action: "palette",
    group: "Navigate",
  },
  {
    id: "shortcuts",
    keys: ["?"],
    label: "Show keyboard shortcuts",
    action: "shortcuts",
    group: "Navigate",
  },
  ...appNavigation.map(
    (item): Shortcut => ({
      id: `go-${item.key}`,
      keys: ["g", item.key],
      label: `Go to ${item.label}`,
      href: item.href,
      group: "Go to page",
    })
  ),
];

/** How long the `g` prefix waits for its letter. */
export const SEQUENCE_TIMEOUT_MS = 1000;

export type ShortcutMatcher = {
  /**
   * Feed one key press (the event's `key`); returns the shortcut it
   * completes, or null while a sequence is pending or nothing matches.
   */
  press(key: string, now: number): Shortcut | null;
  /** Forget a pending prefix (focus moved into a field, a dialog opened). */
  reset(): void;
};

/**
 * Matches sequence shortcuts (`g` then a letter) across key presses. Chords
 * are matched by the caller from the event's modifier flags; this only sees
 * plain keys. A prefix is remembered for `SEQUENCE_TIMEOUT_MS`, then dropped,
 * so a stray `g` a few seconds ago can't turn `s` into a navigation.
 */
export function createShortcutMatcher(
  list: readonly Shortcut[] = shortcuts,
  timeoutMs = SEQUENCE_TIMEOUT_MS
): ShortcutMatcher {
  const sequences = list.filter((shortcut) => !shortcut.chord);
  let pending: string[] = [];
  let pendingAt = 0;

  return {
    press(key, now) {
      if (pending.length > 0 && now - pendingAt > timeoutMs) pending = [];
      const candidate = [...pending, key];

      const exact = sequences.find((shortcut) =>
        sameKeys(shortcut.keys, candidate)
      );
      if (exact) {
        pending = [];
        return exact;
      }

      const isPrefix = sequences.some(
        (shortcut) =>
          shortcut.keys.length > candidate.length &&
          sameKeys(shortcut.keys.slice(0, candidate.length), candidate)
      );
      if (isPrefix) {
        pending = candidate;
        pendingAt = now;
      } else {
        pending = [];
      }
      return null;
    },
    reset() {
      pending = [];
    },
  };
}

function sameKeys(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}

/**
 * Whether a key event started where single keys already mean something: a
 * field that takes typing, or an open dialog, menu, or listbox with its own
 * keyboard handling. Plain shortcuts stay quiet there; chords (Mod+K) still
 * fire.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return (
    target.closest('[role="dialog"], [role="menu"], [role="listbox"]') !== null
  );
}

/** Whether the keyboard has a Command key, for showing ⌘ instead of Ctrl. */
export function isApplePlatform(
  nav: Pick<Navigator, "platform" | "userAgent">
): boolean {
  return /Mac|iPhone|iPad|iPod/.test(nav.platform || nav.userAgent);
}

/** The keys of a shortcut as the labels the Kbd component shows. */
export function keyLabels(
  keys: readonly ShortcutKey[],
  { apple }: { apple: boolean }
): string[] {
  return keys.map((key) => {
    if (key === "Mod") return apple ? "⌘" : "Ctrl";
    if (key === "Shift") return apple ? "⇧" : "Shift";
    return key.length === 1 ? key.toUpperCase() : key;
  });
}
