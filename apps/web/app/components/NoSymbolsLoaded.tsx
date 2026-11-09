import { EmptyState } from "@astraq/ui";

/** Today and Stocks before any candles are stored; both point at the commands. */
export function NoSymbolsLoaded() {
  return (
    <EmptyState
      title="No candles loaded yet"
      description="Load the symbol list and the first candles: pnpm --filter @astraq/api symbols:sync, then bootstrap."
    />
  );
}
