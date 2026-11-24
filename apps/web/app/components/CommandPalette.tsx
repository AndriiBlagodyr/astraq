"use client";

import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  THEME_NAMES,
  useTheme,
  useToastManager,
} from "@astraq/ui";
import { postAuth } from "@/lib/auth-client";
import {
  actionCommands,
  parseRecent,
  rememberRecent,
  tickerOfPath,
  type PaletteCommand,
} from "@/lib/command-palette";
import { createLocalStore } from "@/lib/local-store";
import {
  createShortcutMatcher,
  isApplePlatform,
  isTypingTarget,
  type Shortcut,
} from "@/lib/shortcuts";
import { OrderTicketDrawer } from "./OrderTicket";
import { PaletteSearch, type PaletteSearchProps } from "./PaletteSearch";
import { ShortcutsDialog } from "./ShortcutsDialog";

// The ⌘K command palette and the app's keyboard shortcuts (docs/ui-plan.md
// § App shell; motion plan "Command palette" and "Keyboard shortcuts").
// One provider in the app layout owns both dialogs and the global key
// listener, so the top-bar trigger, `/`, and Mod+K all open the same
// palette. The lists and the ranking live in lib/command-palette.ts and
// lib/shortcuts.ts, and the search box with its results in
// PaletteSearch.tsx; this file owns the state and runs what's chosen.

// Recent items live in localStorage and reach React through
// useSyncExternalStore (lib/local-store.ts).
const recentStore = createLocalStore("veracand-palette-recent");

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

const noSubscription = () => () => {};

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const toast = useToastManager();
  const { mode, theme, toggleMode, setTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // The order ticket the palette opens (docs/ui-plan.md § Order ticket). On
  // a stock page it is for that symbol; the ticker is kept from the moment
  // it opened, so the drawer doesn't change under a navigation.
  const pageTicker = tickerOfPath(usePathname());
  const [ticket, setTicket] = useState<{ ticker: string | null } | null>(null);
  // Both read browser state, so they render their server values first and
  // settle after hydration; the trigger's hint flips from Ctrl to ⌘ then.
  const apple = useSyncExternalStore(
    noSubscription,
    () => isApplePlatform(navigator),
    () => false
  );
  const recentRaw = useSyncExternalStore(
    recentStore.subscribe,
    recentStore.read,
    recentStore.readOnServer
  );
  const recent = useMemo(() => parseRecent(recentRaw), [recentRaw]);

  const nextTheme =
    THEME_NAMES[(THEME_NAMES.indexOf(theme) + 1) % THEME_NAMES.length];

  const signOut = useCallback(async () => {
    const result = await postAuth("logout");
    if (!result.ok) {
      toast.add({
        title: "Couldn't sign out",
        description: result.error ?? undefined,
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
        recentStore.write(rememberRecent(recent, command));
        router.push(command.href as Route);
        return;
      }
      switch (command.action) {
        case "trade":
          setTicket({ ticker: pageTicker });
          break;
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
    [nextTheme, pageTicker, recent, router, setTheme, signOut, toggleMode]
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
        actions={actionCommands({ mode, nextTheme, ticker: pageTicker })}
        apple={apple}
        onRun={run}
        finalFocus={finalFocus}
      />
      <ShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        apple={apple}
      />
      <OrderTicketDrawer
        open={ticket !== null}
        onOpenChange={(open) => {
          if (!open) setTicket(null);
        }}
        ticker={ticket?.ticker ?? undefined}
      />
    </CommandPaletteContext.Provider>
  );
}

type CommandPaletteDialogProps = PaletteSearchProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
