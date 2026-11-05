"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AddWatchlistItemBodySchema,
  ReorderWatchlistBodySchema,
  WatchlistIdParamSchema,
  WatchlistNameBodySchema,
} from "@astraq/shared";
import { z } from "zod";
import { api, problemDetail, userApi } from "@/lib/api";
import type { SymbolSummary } from "@/lib/market-data";

// The watchlist writes, as server actions: a client component calls one
// like a function, Next posts it to this server, and it calls the api with
// the session cookie's token. Every action is a public endpoint, so it
// validates its input with the same shared schemas the api uses before
// forwarding anything, and tells the router which pages changed.

export type ActionResult<T = null> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** What an undo needs to bring a deleted watchlist back (with a new id). */
export type WatchlistSnapshot = { name: string; tickers: string[] };

const indexPath = "/watchlists";
const detailPath = (id: string) => `/watchlists/${id}` as Route;

function failed<T = null>(error: string): ActionResult<T> {
  return { ok: false, error };
}

/** Zod's first message, for a form field or a toast. */
function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

/**
 * Creating from the index: a form action, so it works before hydration and
 * `useActionState` can show the error. Opens the new list on success.
 */
export async function createWatchlist(
  _previous: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const parsed = WatchlistNameBodySchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const client = await userApi();
  const { data, response } = await client.POST("/api/watchlists", {
    body: parsed.data,
  });
  if (response.status === 401) redirect("/login");
  if (!data) {
    return { error: await problemDetail(response, "Couldn't create the list") };
  }
  revalidatePath(indexPath);
  redirect(detailPath(data.id));
}

export async function renameWatchlist(
  id: string,
  name: string
): Promise<ActionResult> {
  const parsed = WatchlistIdParamSchema.extend(
    WatchlistNameBodySchema.shape
  ).safeParse({ id, name });
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const client = await userApi();
  const { response } = await client.PATCH("/api/watchlists/{id}", {
    params: { path: { id } },
    body: { name: parsed.data.name },
  });
  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    return failed(await problemDetail(response, "Couldn't rename the list"));
  }
  revalidatePath(indexPath);
  revalidatePath(detailPath(id));
  return { ok: true, value: null };
}

/**
 * Deletes a list and returns what it held, so the undo toast can restore it.
 * The api has no soft delete: undo recreates the list (with a new id) and
 * re-adds its symbols in order.
 */
export async function deleteWatchlist(
  id: string
): Promise<ActionResult<WatchlistSnapshot>> {
  const parsed = WatchlistIdParamSchema.safeParse({ id });
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const client = await userApi();
  const current = await client.GET("/api/watchlists/{id}", {
    params: { path: { id } },
    cache: "no-store",
  });
  if (current.response.status === 401) redirect("/login");
  if (!current.data) {
    return failed(await problemDetail(current.response, "List not found"));
  }

  const { response } = await client.DELETE("/api/watchlists/{id}", {
    params: { path: { id } },
  });
  if (!response.ok) {
    return failed(await problemDetail(response, "Couldn't delete the list"));
  }
  revalidatePath(indexPath);
  return {
    ok: true,
    value: {
      name: current.data.name,
      tickers: current.data.items.map((item) => item.ticker),
    },
  };
}

/** The undo of `deleteWatchlist`. */
export async function restoreWatchlist(
  snapshot: WatchlistSnapshot
): Promise<ActionResult<{ id: string }>> {
  const parsed = WatchlistNameBodySchema.extend(
    ReorderWatchlistBodySchema.shape
  ).safeParse(snapshot);
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const client = await userApi();
  const created = await client.POST("/api/watchlists", {
    body: { name: parsed.data.name },
  });
  if (created.response.status === 401) redirect("/login");
  if (!created.data) {
    return failed(
      await problemDetail(created.response, "Couldn't restore the list")
    );
  }
  // Each add appends, so adding in the saved order restores it.
  for (const ticker of parsed.data.tickers) {
    await client.POST("/api/watchlists/{id}/items", {
      params: { path: { id: created.data.id } },
      body: { ticker },
    });
  }
  revalidatePath(indexPath);
  return { ok: true, value: { id: created.data.id } };
}

export async function addSymbol(
  id: string,
  ticker: string
): Promise<ActionResult> {
  const parsed = WatchlistIdParamSchema.extend(
    AddWatchlistItemBodySchema.shape
  ).safeParse({ id, ticker: ticker.trim().toUpperCase() });
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const client = await userApi();
  const { response } = await client.POST("/api/watchlists/{id}/items", {
    params: { path: { id } },
    body: { ticker: parsed.data.ticker },
  });
  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    return failed(
      await problemDetail(response, `Couldn't add ${parsed.data.ticker}`)
    );
  }
  revalidatePath(indexPath);
  revalidatePath(detailPath(id));
  return { ok: true, value: null };
}

export async function removeSymbol(
  id: string,
  ticker: string
): Promise<ActionResult> {
  const parsed = WatchlistIdParamSchema.extend(
    AddWatchlistItemBodySchema.shape
  ).safeParse({ id, ticker });
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const client = await userApi();
  const { response } = await client.DELETE(
    "/api/watchlists/{id}/items/{ticker}",
    { params: { path: { id, ticker: parsed.data.ticker } } }
  );
  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    return failed(await problemDetail(response, `Couldn't remove ${ticker}`));
  }
  revalidatePath(indexPath);
  revalidatePath(detailPath(id));
  return { ok: true, value: null };
}

/**
 * Puts the list in `tickers` order. Also the undo of `removeSymbol`: the row
 * is re-added (which appends it) and the list put back in its old order.
 */
export async function reorderWatchlist(
  id: string,
  tickers: string[],
  { restore }: { restore?: string } = {}
): Promise<ActionResult> {
  const parsed = WatchlistIdParamSchema.extend(
    ReorderWatchlistBodySchema.shape
  ).safeParse({ id, tickers });
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const client = await userApi();
  if (restore) {
    const added = await client.POST("/api/watchlists/{id}/items", {
      params: { path: { id } },
      body: { ticker: restore },
    });
    if (added.response.status === 401) redirect("/login");
    if (!added.response.ok) {
      return failed(
        await problemDetail(added.response, `Couldn't restore ${restore}`)
      );
    }
  }
  const { response } = await client.PUT("/api/watchlists/{id}/items/order", {
    params: { path: { id } },
    body: { tickers: parsed.data.tickers },
  });
  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    return failed(await problemDetail(response, "Couldn't reorder the list"));
  }
  revalidatePath(detailPath(id));
  return { ok: true, value: null };
}

const searchQuery = z.string().trim().max(64);

/**
 * Suggestions for the add-symbol box. Symbol search is public data, so this
 * uses the plain client; it's an action only because the browser never calls
 * the api directly.
 */
export async function suggestSymbols(query: string): Promise<SymbolSummary[]> {
  const parsed = searchQuery.safeParse(query);
  if (!parsed.success || !parsed.data) return [];
  const { data } = await api.GET("/api/symbols", {
    params: { query: { query: parsed.data } },
    cache: "no-store",
  });
  return data?.symbols.slice(0, 8) ?? [];
}
