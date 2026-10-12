import { Input } from "@astraq/ui";

/**
 * The top bar's symbol search (docs/ui-plan.md § App shell). A plain GET form
 * to /stocks, so it works before JavaScript loads; /stocks opens an exact
 * ticker directly. Becomes the ⌘K command palette in Phase 2.
 */
export function SymbolSearch() {
  return (
    <form action="/stocks" role="search" className="min-w-0 flex-1 sm:max-w-80">
      <label className="sr-only" htmlFor="top-bar-search">
        Search symbols
      </label>
      <Input
        id="top-bar-search"
        name="q"
        type="search"
        placeholder="Search symbols…"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
      />
    </form>
  );
}
