"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  Button,
  useToastManager,
} from "@astraq/ui";
import { addSymbol, suggestSymbols } from "@/app/(app)/watchlists/actions";
import type { SymbolSummary } from "@/lib/market-data";

const SUGGEST_DELAY_MS = 150;

/**
 * Adds a symbol to a watchlist by ticker or name. Suggestions come from the
 * api's symbol search through a server action, debounced; picking one adds
 * it at once, and a typed ticker adds on Enter, so the box works for both
 * "type NVDA" and "find that chip company".
 */
export function AddSymbolForm({
  watchlistId,
  watchlistName,
}: {
  watchlistId: string;
  watchlistName: string;
}) {
  const toast = useToastManager();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SymbolSummary[]>([]);
  const [pending, startTransition] = useTransition();
  const latest = useRef(0);

  // Suggestions follow the query after a short pause. An emptied box clears
  // them in the change handler, so this effect only ever waits and fetches.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const request = ++latest.current;
    const timer = setTimeout(async () => {
      const found = await suggestSymbols(trimmed);
      // A slower, older answer must not overwrite a newer query's.
      if (request === latest.current) setSuggestions(found);
    }, SUGGEST_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  function add(ticker: string) {
    const symbol = ticker.trim().toUpperCase();
    if (!symbol) return;
    startTransition(async () => {
      const result = await addSymbol(watchlistId, symbol);
      if (result.ok) {
        setQuery("");
        setSuggestions([]);
        toast.add({
          title: `Added ${symbol} to ${watchlistName}`,
          type: "success",
        });
      } else {
        toast.add({ title: result.error, type: "danger", priority: "high" });
      }
    });
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        add(query);
      }}
    >
      <Autocomplete
        items={suggestions}
        value={query}
        onValueChange={(value, details) => {
          setQuery(value);
          if (!value.trim()) {
            latest.current++;
            setSuggestions([]);
          }
          if (details.reason === "item-press") add(value);
        }}
        itemToStringValue={(symbol: SymbolSummary) => symbol.ticker}
        // The server already filtered; filtering again by the full label
        // would hide name matches.
        mode="none"
      >
        <AutocompleteInput
          aria-label="Add a symbol"
          placeholder="Add a symbol: NVDA, Apple…"
          autoComplete="off"
          spellCheck={false}
          className="w-[min(100%,20rem)]"
        />
        <AutocompleteContent>
          <AutocompleteEmpty>
            {query.trim()
              ? "No loaded symbol matches. Enter adds an exact ticker."
              : "Type a ticker or company name."}
          </AutocompleteEmpty>
          <AutocompleteList>
            {(symbol: SymbolSummary) => (
              <AutocompleteItem key={symbol.ticker} value={symbol}>
                <span className="font-semibold text-foreground">
                  {symbol.ticker}
                </span>
                <span className="ml-2 truncate text-muted">{symbol.name}</span>
              </AutocompleteItem>
            )}
          </AutocompleteList>
        </AutocompleteContent>
      </Autocomplete>
      <Button type="submit" variant="secondary" loading={pending}>
        <Plus aria-hidden="true" />
        Add
      </Button>
    </form>
  );
}
