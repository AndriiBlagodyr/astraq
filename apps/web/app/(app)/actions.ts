"use server";

import { z } from "zod";
import { type ActionResult, failed } from "@/lib/action-result";
import { api } from "@/lib/api";
import type { SymbolSummary } from "@/lib/market-data";

// Actions the whole app shell uses, not one page: the command palette and
// the watchlist's add-symbol box both ask for symbol suggestions.

const searchQuery = z.string().trim().max(64);

/**
 * Up to eight symbols matching `query`. Symbol search is public data, so
 * this uses the plain client; it's an action only because the browser never
 * calls the api directly. A search that fails says so: an empty list would
 * read as "nothing matches".
 */
export async function suggestSymbols(
  query: string
): Promise<ActionResult<SymbolSummary[]>> {
  const parsed = searchQuery.safeParse(query);
  if (!parsed.success || !parsed.data) return { ok: true, value: [] };
  try {
    const { data } = await api.GET("/api/symbols", {
      params: { query: { query: parsed.data } },
      cache: "no-store",
    });
    if (!data) return failed("Symbol search isn't answering");
    return { ok: true, value: data.symbols.slice(0, 8) };
  } catch {
    return failed("Symbol search isn't answering");
  }
}
