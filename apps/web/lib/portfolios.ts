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
export type EquityPoint = components["schemas"]["EquityPoint_Output"];
/** A point of the curve on a day every share held had a close. */
export type PricedEquityPoint = EquityPoint & { equity: string };

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
 * The portfolio's equity at each day's close, oldest first; null when it
 * isn't this user's. The last point's `equity` is the portfolio's.
 */
export async function getEquityCurve(
  id: string
): Promise<EquityPoint[] | null> {
  const api = await userApi();
  const { data, response } = await api.GET("/api/portfolios/{id}/equity", {
    params: { path: { id } },
    ...fresh,
  });
  requireSession(response);
  if (response.status === 404) return null;
  if (!data) throw apiFailure(`Equity of portfolio ${id}`, response.status);
  return data.points;
}

/** A portfolio as Today shows it: its books, the day's PnL, and what waits. */
export type PortfolioOverview = {
  portfolio: Portfolio;
  day: { amount: string; date: string } | null;
  /** Orders placed and not yet filled, cancelled, or rejected. */
  openOrders: number;
};

/**
 * Each portfolio with its day PnL and open order count, in the index's
 * order. The index has no books, so each is read on its own: the portfolio
 * first (which settles it), then its curve and orders, so all three are of
 * the same settled state. One deleted in between is left out.
 */
export async function portfolioOverviews(
  summaries: PortfolioSummary[]
): Promise<PortfolioOverview[]> {
  const overviews = await Promise.all(
    summaries.map(async ({ id }) => {
      const portfolio = await getPortfolio(id);
      if (!portfolio) return null;
      const [curve, orders] = await Promise.all([
        getEquityCurve(id),
        listOrders(id),
      ]);
      return {
        portfolio,
        day: dayPnl(curve ?? []),
        openOrders: (orders ?? []).filter((order) => order.status === "open")
          .length,
      };
    })
  );
  return overviews.filter((overview) => overview !== null);
}

/** A position in one symbol, and the portfolio it is held in. */
export type SymbolHolding = {
  portfolio: Pick<Portfolio, "id" | "name">;
  position: Position;
};

/** One of the user's fills in a symbol. */
export type SymbolFill = {
  orderId: string;
  portfolioId: string;
  side: Order["side"];
  quantity: string;
  /** Per share, as traded: not adjusted for a later split. */
  price: string;
  /** The session whose prices filled the order, YYYY-MM-DD. */
  sessionDate: string;
};

/**
 * What the user holds of one symbol and every fill they have had in it,
 * across their portfolios: the stock page's position summary and the
 * chart's fill markers. Fills come oldest first.
 */
export async function symbolTrading(
  ticker: string,
  summaries: PortfolioSummary[]
): Promise<{ holdings: SymbolHolding[]; fills: SymbolFill[] }> {
  const perPortfolio = await Promise.all(
    summaries.map(async ({ id }) => {
      const portfolio = await getPortfolio(id);
      if (!portfolio) return null;
      const orders = (await listOrders(id)) ?? [];
      return {
        position: portfolio.positions.find((held) => held.ticker === ticker),
        portfolio: { id, name: portfolio.name },
        fills: orders.flatMap((order): SymbolFill[] =>
          order.ticker === ticker && order.fill
            ? [
                {
                  orderId: order.id,
                  portfolioId: id,
                  side: order.side,
                  quantity: order.quantity,
                  price: order.fill.price,
                  sessionDate: order.fill.sessionDate,
                },
              ]
            : []
        ),
      };
    })
  );
  const read = perPortfolio.filter((entry) => entry !== null);
  return {
    holdings: read.flatMap(({ portfolio, position }) =>
      position ? [{ portfolio, position }] : []
    ),
    fills: read
      .flatMap((entry) => entry.fills)
      .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate)),
  };
}

/** The points that can be drawn: the days with an equity. */
export function pricedPoints(points: EquityPoint[]): PricedEquityPoint[] {
  return points.filter(
    (point): point is PricedEquityPoint => point.equity !== null
  );
}

/**
 * The gain or loss of the curve's last day and the day it is: the day PnL.
 * Null for a portfolio without a ledger, or while that day has no equity.
 */
export function dayPnl(
  points: EquityPoint[]
): { amount: string; date: string } | null {
  const last = points.at(-1);
  return last && last.pnl !== null
    ? { amount: last.pnl, date: last.date }
    : null;
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
