"use client";

import { useState } from "react";
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
  Kbd,
} from "@astraq/ui";
import {
  buildPaletteGroups,
  type PaletteCommand,
  type PaletteGroup,
} from "@/lib/command-palette";
import { useSymbolSuggestions } from "@/lib/use-symbol-suggestions";
import { ShortcutKeys } from "./ShortcutKeys";

export type PaletteSearchProps = {
  recent: readonly PaletteCommand[];
  actions: readonly PaletteCommand[];
  /** Whether to show ⌘ (Apple) or Ctrl in shortcut hints. */
  apple: boolean;
  onRun: (command: PaletteCommand) => void;
};

/**
 * The inside of the command palette: the search box, the grouped results
 * (lib/command-palette.ts ranks them), and the key hints. Mounted per
 * opening by CommandPalette.tsx, so the query starts clean each time.
 */
export function PaletteSearch({
  recent,
  actions,
  apple,
  onRun,
}: PaletteSearchProps) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  // The list shows the symbols for this exact query; until they arrive it
  // is "searching", and a search that failed says so instead of "nothing".
  const { symbols, searching, failed } = useSymbolSuggestions(query);

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
          {searching
            ? "Searching symbols…"
            : failed
              ? "Symbol search isn’t answering. Pages and actions still work."
              : null}
        </ComboboxStatus>
        <ComboboxEmpty>
          {searching || failed ? null : `Nothing matches “${trimmed}”.`}
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
