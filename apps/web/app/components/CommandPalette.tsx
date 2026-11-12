"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { CornerDownLeft, Search } from "lucide-react";
import {
  Combobox,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxStatus,
  Dialog,
  DialogContent,
  Kbd,
  THEME_NAMES,
  useTheme,
  useToastManager,
} from "@astraq/ui";
import { suggestSymbols } from "@/app/(app)/watchlists/actions";
import {
  actionCommands,
  buildPaletteGroups,
  rememberRecent,
  type PaletteCommand,
  type PaletteGroup,
  type PaletteSymbol,
} from "@/lib/command-palette";
import {
  createShortcutMatcher,
  isApplePlatform,
  isTypingTarget,
  type Shortcut,
} from "@/lib/shortcuts";
import { ShortcutKeys } from "./ShortcutKeys";
import { ShortcutsDialog } from "./ShortcutsDialog";

// The ⌘K command palette and the app's keyboard shortcuts (docs/ui-plan.md
// § App shell; motion plan "Command palette" and "Keyboard shortcuts").
// One provider in the app layout owns both dialogs and the global key
// listener, so the top-bar trigger, `/`, and Mod+K all open the same
// palette. The lists and the ranking live in lib/command-palette.ts and
// lib/shortcuts.ts; this file renders them and runs what's chosen.

const RECENT_STORAGE_KEY = "veracand-palette-recent";
const SUGGEST_DELAY_MS = 150;

type CommandPaletteContextValue = {
  openPalette: () => void;
  openShortcuts: () => void;
  /** Whether to show ⌘ (Apple) or Ctrl in shortcut hints. */
  apple: boolean;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null
);

export function useCommandPalette(): CommandPaletteContextValue {
  const value = useContext(CommandPaletteContext);
  if (!value) {
    throw new Error("useCommandPalette needs a CommandPaletteProvider");
  }
  return value;
}

// Recent items live in localStorage and reach React through
// useSyncExternalStore: the server snapshot is empty, the browser's is the
// stored string (a stable primitive, so the hook can compare it), and a save
// notifies subscribers with an event, since `storage` only fires in other tabs.
const RECENT_EVENT = "veracand-palette-recent-change";

function subscribeRecent(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(RECENT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(RECENT_EVENT, onChange);
  };
}

function readRecentRaw(): string {
  try {
    return window.localStorage.getItem(RECENT_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function parseRecent(raw: string): PaletteCommand[] {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is PaletteCommand =>
            typeof item === "object" &&
            item !== null &&
            typeof item.id === "string" &&
            typeof item.label === "string" &&
            typeof item.href === "string"
        )
      : [];
  } catch {
    return [];
  }
}

function saveRecent(recent: PaletteCommand[]) {
  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recent));
    window.dispatchEvent(new Event(RECENT_EVENT));
  } catch {
    // Private mode or a full store: recents are a convenience only.
  }
}

const noSubscription = () => () => {};

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const toast = useToastManager();
  const { mode, theme, toggleMode, setTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Both read browser state, so they render their server values first and
  // settle after hydration; the trigger's hint flips from Ctrl to ⌘ then.
  const apple = useSyncExternalStore(
    noSubscription,
    () => isApplePlatform(navigator),
    () => false
  );
  const recentRaw = useSyncExternalStore(
    subscribeRecent,
    readRecentRaw,
    () => ""
  );
  const recent = useMemo(() => parseRecent(recentRaw), [recentRaw]);

  const nextTheme =
    THEME_NAMES[(THEME_NAMES.indexOf(theme) + 1) % THEME_NAMES.length];

  const signOut = useCallback(async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      toast.add({
        title: "Couldn't sign out",
        type: "danger",
        priority: "high",
      });
      return;
    }
    router.push("/login");
    router.refresh();
  }, [router, toast]);

  // A command whose target is a field on the page already open ("New
  // watchlist" on /watchlists): nothing remounts, so nothing would focus
  // it. The dialog hands focus to that element when it closes, instead of
  // back to the search box.
  const focusOnClose = useRef<string | null>(null);
  const finalFocus = useCallback(() => {
    const id = focusOnClose.current;
    focusOnClose.current = null;
    return (id ? document.getElementById(id) : null) ?? true;
  }, []);

  const run = useCallback(
    (command: PaletteCommand) => {
      if (command.href) {
        const [path, hash] = command.href.split("#");
        if (hash && path === window.location.pathname) {
          focusOnClose.current = hash;
        }
      }
      setPaletteOpen(false);
      if (command.href) {
        saveRecent(rememberRecent(recent, command));
        router.push(command.href as Route);
        return;
      }
      switch (command.action) {
        case "toggle-mode":
          toggleMode();
          break;
        case "next-theme":
          setTheme(nextTheme);
          break;
        case "shortcuts":
          setShortcutsOpen(true);
          break;
        case "sign-out":
          void signOut();
          break;
      }
    },
    [nextTheme, recent, router, setTheme, signOut, toggleMode]
  );

  const runShortcut = useCallback(
    (shortcut: Shortcut) => {
      if (shortcut.href) {
        router.push(shortcut.href as Route);
      } else if (shortcut.action === "palette") {
        setShortcutsOpen(false);
        setPaletteOpen(true);
      } else if (shortcut.action === "shortcuts") {
        setPaletteOpen(false);
        setShortcutsOpen(true);
      }
    },
    [router]
  );

  // The global listener. Mod+K toggles the palette from anywhere, even a
  // text field; the plain keys (`/`, `?`, `g` then a letter) only fire
  // outside fields and dialogs, where a letter would otherwise be typed or
  // the dialog's own keys apply.
  useEffect(() => {
    const matcher = createShortcutMatcher();
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShortcutsOpen(false);
        setPaletteOpen((open) => !open);
        return;
      }
      if (mod || event.altKey) return;
      if (paletteOpen || shortcutsOpen || isTypingTarget(event.target)) {
        matcher.reset();
        return;
      }
      const hit = matcher.press(event.key, event.timeStamp);
      if (!hit) return;
      event.preventDefault();
      runShortcut(hit);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paletteOpen, shortcutsOpen, runShortcut]);

  const context = useMemo<CommandPaletteContextValue>(
    () => ({
      openPalette: () => {
        setShortcutsOpen(false);
        setPaletteOpen(true);
      },
      openShortcuts: () => {
        setPaletteOpen(false);
        setShortcutsOpen(true);
      },
      apple,
    }),
    [apple]
  );

  return (
    <CommandPaletteContext.Provider value={context}>
      {children}
      <CommandPaletteDialog
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        recent={recent}
        actions={actionCommands({ mode, nextTheme })}
        apple={apple}
        onRun={run}
        finalFocus={finalFocus}
      />
      <ShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        apple={apple}
      />
    </CommandPaletteContext.Provider>
  );
}

type CommandPaletteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recent: readonly PaletteCommand[];
  actions: readonly PaletteCommand[];
  apple: boolean;
  onRun: (command: PaletteCommand) => void;
  /** Where focus goes when the dialog closes; `true` is back to the trigger. */
  finalFocus: () => HTMLElement | true;
};

function CommandPaletteDialog({
  open,
  onOpenChange,
  recent,
  actions,
  apple,
  onRun,
  finalFocus,
}: CommandPaletteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Command palette"
        description="Search symbols and pages, or run an action."
        hideTitle
        closeButton={false}
        finalFocus={finalFocus}
        className="top-[max(1rem,12dvh)] w-[min(92vw,38rem)] translate-y-0 gap-0 overflow-hidden p-0"
      >
        {/* Mounted per opening, so the query and results start clean each time. */}
        <PaletteSearch
          recent={recent}
          actions={actions}
          apple={apple}
          onRun={onRun}
        />
      </DialogContent>
    </Dialog>
  );
}

type SymbolResults = { query: string; symbols: PaletteSymbol[] };

function PaletteSearch({
  recent,
  actions,
  apple,
  onRun,
}: Omit<CommandPaletteDialogProps, "open" | "onOpenChange" | "finalFocus">) {
  const [query, setQuery] = useState("");
  // The last answer and the query it answers. The list shows it only while
  // the query still matches, and "searching" is simply "no answer yet".
  const [results, setResults] = useState<SymbolResults>({
    query: "",
    symbols: [],
  });
  const latest = useRef(0);

  const trimmed = query.trim();
  const symbols = results.query === trimmed ? results.symbols : [];
  const searching = trimmed !== "" && results.query !== trimmed;

  // Symbols come from the api's search through a server action, after a
  // short pause, like the watchlist's add-symbol box.
  useEffect(() => {
    if (!trimmed) return;
    const request = ++latest.current;
    const timer = setTimeout(async () => {
      const found = await suggestSymbols(trimmed);
      // A slower, older answer must not overwrite a newer query's.
      if (request === latest.current) {
        setResults({ query: trimmed, symbols: found });
      }
    }, SUGGEST_DELAY_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const groups = buildPaletteGroups({ query, recent, symbols, actions });

  return (
    <>
      <Combobox<PaletteCommand, false, PaletteGroup>
        inline
        open
        modal={false}
        items={groups}
        filter={null}
        value={null}
        onValueChange={(command) => {
          if (command) onRun(command);
        }}
        inputValue={query}
        onInputValueChange={setQuery}
        itemToStringLabel={(command) => command.label}
        autoHighlight
      >
        <ComboboxInput
          aria-label="Search symbols, pages, and actions"
          placeholder="Search symbols, pages, actions…"
          autoComplete="off"
          spellCheck={false}
          trigger={false}
          size="lg"
          className="rounded-none border-0 border-b border-border bg-transparent shadow-none focus-within:border-border focus-within:shadow-none"
        />
        <ComboboxStatus>
          {searching ? "Searching symbols…" : null}
        </ComboboxStatus>
        <ComboboxEmpty>
          {searching ? null : `Nothing matches “${trimmed}”.`}
        </ComboboxEmpty>
        <ComboboxList className="max-h-[min(60dvh,24rem)] p-2">
          {(group: PaletteGroup) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxGroupLabel>{group.value}</ComboboxGroupLabel>
              <ComboboxCollection>
                {(command: PaletteCommand) => (
                  <ComboboxItem
                    key={command.id}
                    value={command}
                    className="pr-3"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold text-foreground">
                        {command.label}
                      </span>
                      {command.hint ? (
                        <span className="ml-2 text-muted">{command.hint}</span>
                      ) : null}
                    </span>
                    {command.shortcut ? (
                      <ShortcutKeys keys={command.shortcut} apple={apple} />
                    ) : null}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </Combobox>
      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Kbd size="sm">↑</Kbd>
          <Kbd size="sm">↓</Kbd>
          move
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd size="sm">
            <CornerDownLeft aria-hidden="true" />
            <span className="sr-only">Enter</span>
          </Kbd>
          open
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd size="sm">Esc</Kbd>
          close
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <Search aria-hidden="true" className="size-3.5" />
          Symbols from every listed US equity
        </span>
      </footer>
    </>
  );
}
