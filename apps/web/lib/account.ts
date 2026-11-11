import { cache } from "react";
import type { components } from "@astraq/sdk";
import { redirect } from "next/navigation";
import { apiFailure, fresh, userApi } from "./api";

// Server-side reads of the signed-in user's account (docs/ui-plan.md
// § Settings). Server components only; the writes are server actions in
// app/(app)/settings/actions.ts.

export type Account = components["schemas"]["Account_Output"];
export type AccountSession = components["schemas"]["AccountSession_Output"];

/**
 * The signed-in user's profile. Wrapped in React's `cache`, so the app
 * layout's user menu and a settings page share one request per render.
 */
export const getAccount = cache(async (): Promise<Account> => {
  const api = await userApi();
  const { data, response } = await api.GET("/api/me", fresh);
  if (response.status === 401) redirect("/login");
  if (!data) throw apiFailure("Loading the account", response.status);
  return data;
});

/** The user's live sessions, newest first; the current one is marked. */
export async function listSessions(): Promise<AccountSession[]> {
  const api = await userApi();
  const { data, response } = await api.GET("/api/me/sessions", fresh);
  if (response.status === 401) redirect("/login");
  if (!data) throw apiFailure("Listing sessions", response.status);
  return data.sessions;
}
