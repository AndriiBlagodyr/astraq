import { cache } from "react";
import type { components } from "@astraq/sdk";
import { apiFailure, fresh, requireSession, userApi } from "./api";
import { cashRatio, subtractCash } from "./money";

// Server-side reads of the user's paper portfolios. Server components only;
// the writes are server actions in app/(app)/portfolios/actions.ts.

export type PortfolioSummary = components["schemas"]["PortfolioSummary_Output"];
export type Portfolio = components["schemas"]["Portfolio_Output"];
export type Position = components["schemas"]["Position_Output"];

/** Every portfolio of the signed-in user, oldest first, without its books. */
export async function listPortfolios(): Promise<PortfolioSummary[]> {
  const api = await userApi();
  const { data, response } = await api.GET("/api/portfolios", fresh);
  requireSession(response);
  if (!data) throw apiFailure("Listing portfolios", response.status);
  return data.portfolios;
}

/**
 * One portfolio with its books, or null when it isn't this user's. Reading
 * it settles it first (the api does), so the figures include every fill,
 * split, and dividend that has become due. Wrapped in React's `cache`, so
 * the page and its metadata share one request.
 */
export const getPortfolio = cache(
  async (id: string): Promise<Portfolio | null> => {
    const api = await userApi();
    const { data, response } = await api.GET("/api/portfolios/{id}", {
      params: { path: { id } },
      ...fresh,
    });
    requireSession(response);
    if (response.status === 404) return null;
    if (!data) throw apiFailure(`Portfolio ${id}`, response.status);
    return data;
  }
);

/**
 * What the portfolio has made or lost on the cash paid in: equity less
 * capital, which by the ledger's identity is realized and unrealized PnL
 * plus dividends less fees. `ratio` is that against the capital, and null
 * once the owner has taken out as much as was put in. Null altogether
 * while a position has no price.
 */
export function totalReturn(
  portfolio: Pick<Portfolio, "equity" | "capital">
): { amount: string; ratio: number | null } | null {
  if (portfolio.equity === null) return null;
  const amount = subtractCash(portfolio.equity, portfolio.capital);
  if (amount === null) return null;
  return { amount, ratio: cashRatio(amount, portfolio.capital) };
}

/** The latest session any position is priced at, YYYY-MM-DD; null without one. */
export function pricedAsOf(positions: Position[]): string | null {
  return positions.reduce<string | null>(
    (latest, position) =>
      position.priceDate !== null &&
      (latest === null || position.priceDate > latest)
        ? position.priceDate
        : latest,
    null
  );
}
