import { Injectable } from '@nestjs/common';
import { toIsoDate, utcMidnight } from '../common/dates';
import { lower, upper } from '../common/enum-case';
import { PrismaService } from '../database/prisma.service';
import type {
  FillRule as DbFillRule,
  OrderCloseReason as DbCloseReason,
  OrderSide as DbOrderSide,
  OrderStatus as DbOrderStatus,
  OrderType as DbOrderType,
  Prisma,
} from '../generated/prisma/client';
import {
  LedgerRepository,
  PortfolioNotFoundError,
} from '../ledger/ledger.repository';
import type { FillRule, OrderSide, OrderType } from '../trading/fill-model';
import { firstEligibleSession, sessionDate } from '../trading/market-hours';
import type {
  Book,
  CloseReason,
  CorporateAction,
  LastBar,
  OpenOrder,
  Plan,
  SessionBar,
} from '../trading/settlement';

/** An order as stored, with its symbol and fill; numbers as decimal strings. */
export interface OrderRow {
  id: string;
  symbolId: number;
  ticker: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  limitPrice: string | null;
  status: 'open' | 'filled' | 'cancelled' | 'rejected';
  closeReason: CloseReason | null;
  placedAt: Date;
  closedAt: Date | null;
  fill: {
    rule: FillRule;
    price: string;
    notional: string;
    commission: string;
    sessionDate: string;
    filledAt: Date;
  } | null;
}

/** What a decision about a portfolio's orders is made from. */
export interface OrderBookSnapshot {
  book: Book;
  /**
   * With `scope.symbolId`: the latest stored session of that symbol and of
   * every symbol with an open order, by symbol id. A symbol without bars
   * has no entry. Empty without `scope.symbolId`.
   */
  lastBars: ReadonlyMap<number, LastBar>;
  /** The most one order may come to; null for no limit. */
  maxOrderNotional: string | null;
  /** The order an earlier request placed with `scope.idempotencyKey`. */
  existing: OrderRow | null;
}

export interface OrderScope {
  userId: string;
  portfolioId: string;
  /** Looks up the order already placed with this key. */
  idempotencyKey?: string;
  /**
   * The symbol of the order being placed or previewed: its last bar and
   * splits are loaded, and the last bars of the open orders' symbols.
   */
  symbolId?: number;
}

const orderColumns = {
  id: true,
  symbolId: true,
  side: true,
  type: true,
  quantity: true,
  limitPrice: true,
  status: true,
  closeReason: true,
  placedAt: true,
  closedAt: true,
  symbol: { select: { ticker: true } },
  fill: {
    select: {
      rule: true,
      price: true,
      notional: true,
      commission: true,
      sessionDate: true,
      filledAt: true,
    },
  },
} as const;

type StoredOrder = Prisma.OrderGetPayload<{ select: typeof orderColumns }>;

function toRow({ symbol, fill, ...order }: StoredOrder): OrderRow {
  return {
    ...order,
    ticker: symbol.ticker,
    side: lower(order.side),
    type: lower(order.type),
    quantity: order.quantity.toFixed(),
    limitPrice: order.limitPrice?.toFixed() ?? null,
    status: lower(order.status),
    closeReason: order.closeReason && lower(order.closeReason),
    fill: fill && {
      rule: lower(fill.rule),
      price: fill.price.toFixed(),
      notional: fill.notional.toFixed(2),
      commission: fill.commission.toFixed(2),
      sessionDate: toIsoDate(fill.sessionDate),
      filledAt: fill.filledAt,
    },
  };
}

/** The earliest of the dates given; undefined without any. */
const earliest = (dates: (string | undefined)[]) =>
  dates.filter((date) => date !== undefined).sort()[0];

/**
 * Orders and fills, and the one write path they share with the ledger
 * (ADR 0009 section 7).
 */
@Injectable()
export class OrdersRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerRepository,
  ) {}

  /**
   * Decides and writes a change to a portfolio's orders in one database
   * transaction:
   *
   * 1. `SELECT ... FOR UPDATE` on the portfolio's row (which must be the
   *    user's). Everything that touches this portfolio's orders or ledger
   *    now waits its turn, so two requests can't both spend the same cash,
   *    fill the same order, or place an order for the same idempotency key.
   * 2. Read what the decision needs: the ledger, the open orders, the bars
   *    they may fill on, and the corporate actions of every symbol involved.
   * 3. `decide` (pure: it runs while the lock is held) returns a plan.
   * 4. Write the plan: the new order, orders closed without a fill, and for
   *    every fill its ledger transaction, its fill row, and the order's new
   *    status. All of it commits, or none of it.
   *
   * Returns `decide`'s result and the id of the order the plan placed.
   */
  async transact<T>(
    scope: OrderScope,
    decide: (snapshot: OrderBookSnapshot) => { plan: Plan | null; result: T },
  ): Promise<{ result: T; placedId: string | null }> {
    const { userId, portfolioId } = scope;
    return this.prisma.$transaction(
      async (tx) => {
        const [portfolio] = await tx.$queryRaw<
          {
            slippageBps: number;
            commissionPerOrder: string;
            commissionPerShare: string;
            maxOrderNotional: string | null;
          }[]
        >`
          SELECT slippage_bps AS "slippageBps",
                 commission_per_order::text AS "commissionPerOrder",
                 commission_per_share::text AS "commissionPerShare",
                 max_order_notional::text AS "maxOrderNotional"
          FROM portfolios
          WHERE id = ${portfolioId}::uuid AND user_id = ${userId}::uuid
          FOR UPDATE
        `;
        if (!portfolio) throw new PortfolioNotFoundError(portfolioId);

        const { maxOrderNotional, ...costs } = portfolio;
        const snapshot = await this.snapshot(tx, scope, costs, maxOrderNotional);
        const { plan, result } = decide(snapshot);
        const placedId = plan
          ? await this.write(tx, scope, snapshot.book.history.length, plan)
          : null;
        return { result, placedId };
      },
      // The default 5 seconds is tight for a request queued behind others
      // on the same portfolio's lock.
      { maxWait: 10_000, timeout: 20_000 },
    );
  }

  /** The portfolio's orders, newest first. */
  async findAll(portfolioId: string): Promise<OrderRow[]> {
    const orders = await this.prisma.order.findMany({
      where: { portfolioId },
      select: orderColumns,
      orderBy: [{ placedAt: 'desc' }, { id: 'desc' }],
    });
    return orders.map(toRow);
  }

  /** One of the portfolio's orders, or null. */
  async findOne(portfolioId: string, id: string): Promise<OrderRow | null> {
    const order = await this.prisma.order.findFirst({
      where: { id, portfolioId },
      select: orderColumns,
    });
    return order && toRow(order);
  }

  /** Everything `decide` reads, loaded inside the locked transaction. */
  private async snapshot(
    tx: Prisma.TransactionClient,
    scope: OrderScope,
    costs: Book['costs'],
    maxOrderNotional: string | null,
  ): Promise<OrderBookSnapshot> {
    const { portfolioId, idempotencyKey, symbolId } = scope;

    const existing = idempotencyKey
      ? await tx.order.findUnique({
          where: {
            portfolioId_idempotencyKey: { portfolioId, idempotencyKey },
          },
          select: orderColumns,
        })
      : null;
    const history = await this.ledger.read(tx, portfolioId);
    const open = await tx.order.findMany({
      where: { portfolioId, status: 'OPEN' },
      select: orderColumns,
      orderBy: { placedAt: 'asc' },
    });
    const orders: OpenOrder[] = open.map(toRow);

    // Each open order's symbol from the first session it may fill in.
    const barsFrom = new Map<number, string>();
    for (const order of orders) {
      const from = firstEligibleSession(order.placedAt);
      const known = barsFrom.get(order.symbolId);
      if (known === undefined || from < known) {
        barsFrom.set(order.symbolId, from);
      }
    }
    const bars = await this.loadBars(tx, barsFrom);
    const lastBars = new Map<number, LastBar>();
    if (symbolId !== undefined) {
      for (const id of new Set([symbolId, ...barsFrom.keys()])) {
        const last = await this.loadLastBar(tx, id);
        if (last) lastBars.set(id, last);
      }
    }

    // Splits and dividends of every symbol the ledger, an open order, or
    // the new order names, from the earliest day any of them goes back to.
    const symbolIds = new Set<number>(barsFrom.keys());
    if (symbolId !== undefined) symbolIds.add(symbolId);
    for (const transaction of history) {
      for (const entry of transaction.entries) {
        if (entry.symbolId !== null) symbolIds.add(entry.symbolId);
      }
    }
    const since = earliest([
      history[0]?.date,
      ...[...lastBars.values()].map((bar) => bar.date),
      ...orders.map((order) => sessionDate(order.placedAt)),
    ]);
    const actions =
      since === undefined
        ? []
        : await this.loadActions(tx, [...symbolIds], since);

    return {
      existing: existing && toRow(existing),
      lastBars,
      maxOrderNotional,
      book: { history, orders, costs, bars, actions },
    };
  }

  /** Each symbol's daily bars from its session date on, oldest first. */
  private async loadBars(
    tx: Prisma.TransactionClient,
    from: ReadonlyMap<number, string>,
  ): Promise<SessionBar[]> {
    if (from.size === 0) return [];
    const bars = await tx.candleDaily.findMany({
      where: {
        OR: [...from].map(([symbolId, date]) => ({
          symbolId,
          ts: { gte: utcMidnight(date) },
        })),
      },
      orderBy: { ts: 'asc' },
    });
    return bars.map((bar) => ({
      symbolId: bar.symbolId,
      date: toIsoDate(bar.ts),
      open: bar.open.toFixed(),
      high: bar.high.toFixed(),
      low: bar.low.toFixed(),
      close: bar.close.toFixed(),
    }));
  }

  /** The symbol's latest stored session; null without one. */
  private async loadLastBar(
    tx: Prisma.TransactionClient,
    symbolId: number,
  ): Promise<LastBar | null> {
    const last = await tx.candleDaily.findFirst({
      where: { symbolId },
      orderBy: { ts: 'desc' },
      select: { ts: true, close: true },
    });
    return last && { date: toIsoDate(last.ts), close: last.close.toFixed() };
  }

  /** The symbols' splits and dividends with an ex-date from `since` on. */
  private async loadActions(
    tx: Prisma.TransactionClient,
    symbolIds: number[],
    since: string,
  ): Promise<CorporateAction[]> {
    if (symbolIds.length === 0) return [];
    const actions = await tx.corporateAction.findMany({
      where: {
        symbolId: { in: symbolIds },
        exDate: { gte: utcMidnight(since) },
      },
      orderBy: [{ exDate: 'asc' }, { id: 'asc' }],
    });
    return actions.map((action) => ({
      symbolId: action.symbolId,
      type: lower(action.type),
      exDate: toIsoDate(action.exDate),
      splitFrom: action.splitFrom?.toFixed() ?? null,
      splitTo: action.splitTo?.toFixed() ?? null,
      cashAmount: action.cashAmount?.toFixed() ?? null,
      payDate: action.payDate && toIsoDate(action.payDate),
    }));
  }

  /** Writes a plan after `historyLength` ledger transactions; returns the placed order's id. */
  private async write(
    tx: Prisma.TransactionClient,
    scope: OrderScope,
    historyLength: number,
    plan: Plan,
  ): Promise<string | null> {
    const { portfolioId } = scope;
    let placedId: string | null = null;

    if (plan.placed) {
      const placed = plan.placed;
      const created = await tx.order.create({
        data: {
          portfolioId,
          symbolId: placed.symbolId,
          side: upper(placed.side) as DbOrderSide,
          type: upper(placed.type) as DbOrderType,
          quantity: placed.quantity,
          limitPrice: placed.limitPrice,
          status: upper(placed.status) as DbOrderStatus,
          closeReason: placed.reason && (upper(placed.reason) as DbCloseReason),
          idempotencyKey: scope.idempotencyKey!,
          placedAt: placed.placedAt,
          closedAt: placed.closedAt,
        },
        select: { id: true },
      });
      placedId = created.id;
    }

    for (const closed of plan.closed) {
      await tx.order.update({
        where: { id: closed.orderId },
        data: {
          status: upper(closed.status) as DbOrderStatus,
          closeReason: upper(closed.reason) as DbCloseReason,
          closedAt: closed.at,
        },
        select: { id: true },
      });
    }

    let seq = historyLength;
    for (const { posting, occurredAt, fill } of plan.postings) {
      seq += 1;
      const ledgerTransactionId = await this.ledger.insert(
        tx,
        portfolioId,
        seq,
        occurredAt,
        posting,
      );
      if (!fill) continue;

      await tx.fill.create({
        data: {
          // A fill without an order id belongs to the order just placed.
          orderId: fill.orderId ?? placedId!,
          ledgerTransactionId,
          rule: upper(fill.rule) as DbFillRule,
          price: fill.price,
          quantity: fill.quantity,
          notional: fill.notional,
          commission: fill.commission,
          sessionDate: utcMidnight(fill.sessionDate),
          filledAt: occurredAt,
        },
        select: { id: true },
      });
      if (fill.orderId) {
        await tx.order.update({
          where: { id: fill.orderId },
          data: { status: 'FILLED', closedAt: occurredAt },
          select: { id: true },
        });
      }
    }
    return placedId;
  }
}
