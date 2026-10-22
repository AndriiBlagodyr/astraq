import { EmptyState } from "@astraq/ui";

/** Today and Stocks before the first bootstrap run; both point at the command. */
export function NoSymbolsLoaded() {
  return (
    <EmptyState
      title="No symbols loaded yet"
      description="Daily candles arrive with the bootstrap: pnpm --filter @astraq/api bootstrap."
    />
  );
}
