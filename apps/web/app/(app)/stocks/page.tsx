import Link from "next/link";
import { Button, Card, EmptyState, Input } from "@astraq/ui";
import { SymbolTable } from "@/app/components/SymbolTable";
import { searchSymbols } from "@/lib/market-data";

export const metadata = {
  title: "Stocks",
};

// Phase 1: search over the bootstrapped symbols (docs/ui-plan.md § Stocks).
// A plain GET form, so search works before any JavaScript loads and every
// result list has a shareable URL.
export default async function StocksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const symbols = await searchSymbols(query || undefined);

  return (
    <main className="grid gap-5">
      <Card className="grid gap-4 p-7">
        <h1 className="m-0 font-display text-3xl font-bold tracking-tight text-foreground">
          Stocks
        </h1>
        <form
          action="/stocks"
          className="flex flex-wrap items-end gap-3"
          role="search"
        >
          <label className="grid min-w-[min(100%,20rem)] flex-1 gap-1.5 text-sm text-secondary">
            Ticker or company name
            <Input
              name="q"
              type="search"
              defaultValue={query}
              placeholder="NVDA, Apple…"
            />
          </label>
          <Button type="submit">Search</Button>
        </form>
      </Card>

      {symbols.length === 0 ? (
        <Card className="p-7">
          {query ? (
            <EmptyState
              title={`No symbols match “${query}”`}
              description="Search covers the symbols loaded so far, by ticker prefix or part of the name."
              action={
                <Link href="/stocks" className="text-brand-strong-fg underline">
                  Show all symbols
                </Link>
              }
            />
          ) : (
            <EmptyState
              title="No symbols loaded yet"
              description="Daily candles arrive with the bootstrap: pnpm --filter @astraq/api bootstrap."
            />
          )}
        </Card>
      ) : (
        <SymbolTable
          symbols={symbols}
          caption={query ? `Symbols matching ${query}` : "All symbols"}
        />
      )}
    </main>
  );
}
