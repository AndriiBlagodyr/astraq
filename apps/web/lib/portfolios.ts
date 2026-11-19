import { cache } from "react";
import { notFound } from "next/navigation";
import type { components } from "@astraq/sdk";
import { PortfolioIdParamSchema } from "@astraq/shared";
import { apiFailure, fresh, requireSession, userApi } from "./api";
import { cashRatio, subtractCash } from "./money";

// Server-side reads of the user's paper portfolios. Server components only;
// the writes are server actions in app/(app)/portfolios/actions.ts.

export type PortfolioSummary = components["schemas"]["PortfolioSummary_Output"];
export type Portfolio = components["schemas"]["Portfolio_Output"];
export type Position = components["schemas"]["Position_Output"];
export type Order = components["schemas"]["Order_Output"];
export type OrderPreview = components["schemas"]["OrderPreview_Output"];
export type ActivityItem = components["schemas"]["ActivityItem_Output"];

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
 * The id a portfolio page was opened with. A malformed one is a 404, like
 * a portfolio that isn't the user's: the api would answer 400, which would
 * read as "the page couldn't load".
 */
export async function portfolioIdFrom(
  params: Promise<{ id: string }>
): Promise<string> {
  const parsed = PortfolioIdParamSchema.safeParse(await params);
  if (!parsed.success) notFound();
  return parsed.data.id;
}

/** The portfolio a page is about, or a 404. */
export async function loadPortfolio(
  params: Promise<{ id: string }>
): Promise<Portfolio> {
  const portfolio = await getPortfolio(await portfolioIdFrom(params));
  if (!portfolio) notFound();
  return portfolio;
}

/** The portfolio's orders with their fills, newest first; null when it isn't this user's. */
export async function listOrders(id: string): Promise<Order[] | null> {
  const api = await userApi();
  const { data, response } = await api.GET("/api/portfolios/{id}/orders", {
    params: { path: { id } },
    ...fresh,
  });
  requireSession(response);
  if (response.status === 404) return null;
  if (!data) throw apiFailure(`Orders of portfolio ${id}`, response.status);
  return data.orders;
}

/**
 * The portfolio's ledger as a timeline, newest first; null when it isn't
 * this user's. The newest line's `cashAfter` is the portfolio's cash.
 */
export async function listActivity(id: string): Promise<ActivityItem[] | null> {
  const api = await userApi();
  const { data, response } = await api.GET("/api/portfolios/{id}/activity", {
    params: { path: { id } },
    ...fresh,
  });
  requireSession(response);
  if (response.status === 404) return null;
  if (!data) throw apiFailure(`Activity of portfolio ${id}`, response.status);
  return data.activity;
}

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
