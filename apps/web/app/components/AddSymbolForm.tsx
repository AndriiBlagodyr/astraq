"use client";

import { useState, useTransition } from "react";
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
import { addSymbol } from "@/app/(app)/watchlists/actions";
import type { SymbolSummary } from "@/lib/market-data";
import { useSymbolSuggestions } from "@/lib/use-symbol-suggestions";

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
  const [pending, startTransition] = useTransition();
  // The last answer stays on screen while the next query's loads, so the
  // list doesn't blink empty between keystrokes; an emptied box has none.
  const { latest: suggestions, failed: searchFailed } =
    useSymbolSuggestions(query);

  function add(ticker: string) {
    const symbol = ticker.trim().toUpperCase();
    if (!symbol) return;
    startTransition(async () => {
      const result = await addSymbol(watchlistId, symbol);
      if (result.ok) {
        setQuery("");
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
            {!query.trim()
              ? "Type a ticker or company name."
              : searchFailed
                ? "Symbol search isn’t answering. Enter still adds an exact ticker."
                : "No loaded symbol matches. Enter adds an exact ticker."}
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
