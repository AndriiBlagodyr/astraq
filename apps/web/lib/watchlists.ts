import { cache } from "react";
import type { components } from "@astraq/sdk";
import { redirect } from "next/navigation";
import { apiFailure, fresh, userApi } from "./api";

// Server-side reads of the user's watchlists. Server components only; the
// writes are server actions in app/(app)/watchlists/actions.ts.

export type WatchlistSummary = components["schemas"]["WatchlistSummary_Output"];
export type Watchlist = components["schemas"]["Watchlist_Output"];
export type WatchlistItem = components["schemas"]["WatchlistItem_Output"];

/** Every watchlist of the signed-in user, in their order. */
export async function listWatchlists(): Promise<WatchlistSummary[]> {
  const api = await userApi();
  const { data, response } = await api.GET("/api/watchlists", fresh);
  if (response.status === 401) redirect("/login");
  if (!data) throw apiFailure("Listing watchlists", response.status);
  return data.watchlists;
}

/**
 * One watchlist with its rows, or null when it isn't this user's (the api
 * answers 404 for another user's list too, so nothing leaks). Wrapped in
 * React's `cache`, so the page and its metadata share one request.
 */
export const getWatchlist = cache(
  async (id: string): Promise<Watchlist | null> => {
    const api = await userApi();
    const { data, response } = await api.GET("/api/watchlists/{id}", {
      params: { path: { id } },
      ...fresh,
    });
    if (response.status === 401) redirect("/login");
    if (response.status === 404) return null;
    if (!data) throw apiFailure(`Watchlist ${id}`, response.status);
    return data;
  }
);
