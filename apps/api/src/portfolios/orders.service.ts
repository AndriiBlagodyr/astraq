import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Order, OrderList, PlaceOrderBody } from '@astraq/shared';
import { compare, decimal } from '../common/decimal';
import type { LedgerState } from '../ledger/ledger';
import { PortfolioNotFoundError } from '../ledger/ledger.repository';
import { OnDemandCandlesService } from '../market-data/on-demand-candles.service';
import { SymbolsRepository } from '../symbols/symbols.repository';
import {
  cancel,
  place,
  settle,
  type OrderRequest,
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
 * The order lifecycle (ROADMAP Phase 3 item 3): place, cancel, fill. The
 * decisions are the pure functions in `trading/settlement.ts`; this turns
 * requests into them and their outcomes into responses.
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
  ) {}

  /** Brings the portfolio up to date and returns its books. 404 when it isn't the user's. */
  async settle(
    userId: string,
    portfolioId: string,
    now = new Date(),
  ): Promise<LedgerState> {
    const { result } = await this.run(() =>
      this.orders.transact({ userId, portfolioId }, ({ book }) => {
        const { plan, state } = settle(book, now);
        return { plan, result: state };
      }),
    );
    return result;
  }

  async list(userId: string, portfolioId: string): Promise<OrderList> {
    await this.settle(userId, portfolioId);
    const rows = await this.orders.findAll(portfolioId);
    return { orders: rows.map(toOrder) };
  }

  /**
   * Places an order, once per idempotency key: a repeat of the key returns
   * the order the first request placed (`replayed`), and a repeat with a
   * different order is a 409. The key is looked up under the portfolio's
   * lock, so two concurrent requests with one key place one order.
   */
  async place(
    userId: string,
    portfolioId: string,
    idempotencyKey: string,
    body: PlaceOrderBody,
    now = new Date(),
  ): Promise<{ order: Order; replayed: boolean }> {
    const ticker = body.ticker.toUpperCase();
    const symbolId = await this.symbols.findIdByTicker(ticker);
    if (symbolId === null) {
      throw new NotFoundException(`Unknown symbol ${ticker}`);
    }
    // A symbol nobody has watched yet has no bars to fill on.
    await this.onDemand.ensureCandles(symbolId);

    const request: OrderRequest = {
      symbolId,
      side: body.side,
      type: body.type,
      quantity: body.quantity,
      limitPrice: body.limitPrice ?? null,
    };
    const { result: existingId, placedId } = await this.run(() =>
      this.orders.transact(
        { userId, portfolioId, idempotencyKey, symbolId },
        ({ book, lastBar, existing }) => {
          if (!existing) {
            return { plan: place(book, request, lastBar, now), result: null };
          }
          const same =
            existing.symbolId === request.symbolId &&
            existing.side === request.side &&
            existing.type === request.type &&
            sameNumber(existing.quantity, request.quantity) &&
            sameNumber(existing.limitPrice, request.limitPrice);
          if (!same) {
            throw new ConflictException(
              'This Idempotency-Key was already used for a different order',
            );
          }
          return { plan: null, result: existing.id };
        },
      ),
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
    const { result: cancelled } = await this.run(() =>
      this.orders.transact({ userId, portfolioId }, ({ book }) => {
        const outcome = cancel(book, orderId, now);
        return { plan: outcome.plan, result: outcome.cancelled };
      }),
    );
    const row = await this.orders.findOne(portfolioId, orderId);
    if (!row) throw new NotFoundException(`Order ${orderId} not found`);
    if (!cancelled && row.status !== 'cancelled') {
      throw new ConflictException(`The order is already ${row.status}`);
    }
    return toOrder(row);
  }

  private async run<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof PortfolioNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
