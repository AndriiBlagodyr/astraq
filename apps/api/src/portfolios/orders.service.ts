import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  CashTransferBody,
  Order,
  OrderList,
  OrderPreview,
  PlaceOrderBody,
} from '@astraq/shared';
import { compare, decimal } from '../common/decimal';
import { inSpan } from '../common/span';
import type { LedgerState } from '../ledger/ledger';
import { MarketCalendarService } from '../market-data/market-calendar.service';
import { OnDemandCandlesService } from '../market-data/on-demand-candles.service';
import { resolveTicker } from '../symbols/resolve-ticker';
import { SymbolsRepository } from '../symbols/symbols.repository';
import {
  cancel,
  place,
  preview,
  settle,
  transfer,
  type OrderAsk,
} from '../trading/settlement';
import { type OrderRow, OrdersRepository } from './orders.repository';

const sameNumber = (a: string | null, b: string | null) =>
  a === null || b === null ? a === b : compare(decimal(a), decimal(b)) === 0;

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    ticker: row.ticker,
    side: row.side,
    type: row.type,
    quantity: row.quantity,
    amount: row.amount,
    limitPrice: row.limitPrice,
    status: row.status,
    closeReason: row.closeReason,
    placedAt: row.placedAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
    fill: row.fill && {
      ...row.fill,
      filledAt: row.fill.filledAt.toISOString(),
    },
  };
}

/**
 * The order lifecycle (ROADMAP Phase 3 items 3 and 5): preview, place,
 * cancel, fill. The decisions are the pure functions in
 * `trading/settlement.ts` and `trading/risk.ts`; this turns requests into
 * them and their outcomes into responses.
 *
 * Nothing runs on a schedule yet, so a portfolio is settled whenever it is
 * read or written: resting orders meet the bars that have arrived since,
 * and splits and dividends are booked. Settling is deterministic and
 * repeatable, so when it happens doesn't change the result. The end-of-day
 * job (Phase 4) will call `settle` after it stores the day's bars.
 */
@Injectable()
export class OrdersService {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly symbols: SymbolsRepository,
    private readonly onDemand: OnDemandCandlesService,
    private readonly calendar: MarketCalendarService,
  ) {}

  /** Brings the portfolio up to date and returns its books. 404 when it isn't the user's. */
  async settle(
    userId: string,
    portfolioId: string,
    now = new Date(),
  ): Promise<LedgerState> {
    const { result } = await this.orders.transact(
      { userId, portfolioId },
      ({ book }) => {
        const { plan, state } = settle(book, now);
        return { plan, result: state };
      },
    );
    return result;
  }

  /**
   * Pays cash in or takes it out, after settling, and returns the books.
   * A withdrawal the cash doesn't cover throws the ledger's
   * `insufficient_cash` and writes nothing.
   */
  async transfer(
    userId: string,
    portfolioId: string,
    body: CashTransferBody,
    now = new Date(),
  ): Promise<LedgerState> {
    const { result } = await this.orders.transact(
      { userId, portfolioId },
      ({ book }) => {
        const { plan, state } = transfer(book, body, now);
        return { plan, result: state };
      },
    );
    return result;
  }

  async list(userId: string, portfolioId: string): Promise<OrderList> {
    await this.settle(userId, portfolioId);
    const rows = await this.orders.findAll(portfolioId);
    return { orders: rows.map(toOrder) };
  }

  /**
   * What placing the order now would do: when it fills, what it is
   * expected to cost, and whether the guards would refuse it. Places
   * nothing and writes nothing.
   */
  async preview(
    userId: string,
    portfolioId: string,
    body: PlaceOrderBody,
    now = new Date(),
  ): Promise<OrderPreview> {
    const request = await this.request(body);
    const calendar = await this.calendar.around(now);
    const { result } = await this.orders.transact(
      { userId, portfolioId, symbolId: request.symbolId },
      ({ book, lastBars, maxOrderNotional }) => ({
        plan: null,
        result: preview(book, request, lastBars, now, calendar, maxOrderNotional),
      }),
    );
    return result;
  }

  /**
   * Places an order, once per idempotency key: a repeat of the key returns
   * the order the first request placed (`replayed`), and a repeat with a
   * different order is a 409. The key is looked up under the portfolio's
   * lock, so two concurrent requests with one key place one order.
   *
   * A new order passes the guards first (`trading/risk.ts`): one the
   * portfolio can't cover, or over its limit per order, is a 422 and is
   * never stored. Both run under the same lock as the write, so two orders
   * can't each be told the same cash is free.
   *
   * An order asked for in dollars (`amount`) is sized in that same step,
   * and stored in the shares it came to with the amount beside them. A
   * repeat of its key is compared by the amount, since the shares depend on
   * the price at the time.
   *
   * Each placement is one span, `order.place` (ROADMAP Phase 3 item 7): the
   * lock, the reads, and the writes below are its children, and it says how
   * the order came out.
   */
  place(
    userId: string,
    portfolioId: string,
    idempotencyKey: string,
    body: PlaceOrderBody,
    now = new Date(),
  ): Promise<{ order: Order; replayed: boolean }> {
    return inSpan(
      'order.place',
      {
        'portfolio.id': portfolioId,
        'order.ticker': body.ticker,
        'order.side': body.side,
        'order.type': body.type,
        ...(body.amount != null
          ? { 'order.amount': body.amount }
          : { 'order.quantity': body.quantity ?? '' }),
      },
      async (span) => {
        const placed = await this.placeOnce(
          userId,
          portfolioId,
          idempotencyKey,
          body,
          now,
        );
        span.setAttributes({
          'order.id': placed.order.id,
          'order.quantity': placed.order.quantity,
          'order.status': placed.order.status,
          'order.replayed': placed.replayed,
        });
        return placed;
      },
    );
  }

  private async placeOnce(
    userId: string,
    portfolioId: string,
    idempotencyKey: string,
    body: PlaceOrderBody,
    now: Date,
  ): Promise<{ order: Order; replayed: boolean }> {
    const request = await this.request(body);
    const { symbolId } = request;
    const calendar = await this.calendar.around(now);

    const { result: existingId, placedId } = await this.orders.transact(
      { userId, portfolioId, idempotencyKey, symbolId },
      ({ book, lastBars, maxOrderNotional, existing }) => {
        if (!existing) {
          const { refusal, quantity } = preview(
            book,
            request,
            lastBars,
            now,
            calendar,
            maxOrderNotional,
          );
          // Without a refusal the order has its shares, asked for or sized.
          if (refusal || quantity === null) {
            throw new UnprocessableEntityException(
              refusal?.message ?? "The order couldn't be sized",
            );
          }
          const lastBar = lastBars.get(symbolId) ?? null;
          return {
            plan: place(book, { ...request, quantity }, lastBar, now, calendar),
            result: null,
          };
        }
        const same =
          existing.symbolId === request.symbolId &&
          existing.side === request.side &&
          existing.type === request.type &&
          (request.quantity === null
            ? sameNumber(existing.amount, request.amount ?? null)
            : existing.amount === null &&
              sameNumber(existing.quantity, request.quantity)) &&
          sameNumber(existing.limitPrice, request.limitPrice);
        if (!same) {
          throw new ConflictException(
            'This Idempotency-Key was already used for a different order',
          );
        }
        return { plan: null, result: existing.id };
      },
    );

    const row = await this.orders.findOne(portfolioId, (existingId ?? placedId)!);
    return { order: toOrder(row!), replayed: existingId !== null };
  }

  /**
   * Cancels an open order. Cancelling a cancelled order returns it again;
   * an order that has filled or been rejected is a 409.
   */
  async cancel(
    userId: string,
    portfolioId: string,
    orderId: string,
    now = new Date(),
  ): Promise<Order> {
    const { result: cancelled } = await this.orders.transact(
      { userId, portfolioId },
      ({ book }) => {
        const outcome = cancel(book, orderId, now);
        return { plan: outcome.plan, result: outcome.cancelled };
      },
    );
    const row = await this.orders.findOne(portfolioId, orderId);
    if (!row) throw new NotFoundException(`Order ${orderId} not found`);
    if (!cancelled && row.status !== 'cancelled') {
      throw new ConflictException(`The order is already ${row.status}`);
    }
    return toOrder(row);
  }

  /** The order a body asks for, with its ticker resolved; 404 for an unknown one. */
  private async request(body: PlaceOrderBody): Promise<OrderAsk> {
    const { symbolId } = await resolveTicker(this.symbols, body.ticker);
    // A symbol nobody has watched yet has no bars to price or fill on.
    await this.onDemand.ensureCandles(symbolId);
    return {
      symbolId,
      side: body.side,
      type: body.type,
      quantity: body.quantity ?? null,
      amount: body.amount ?? null,
      limitPrice: body.limitPrice ?? null,
    };
  }
}
