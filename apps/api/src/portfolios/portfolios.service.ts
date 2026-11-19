import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  ActivityList,
  CashTransferBody,
  CreatePortfolioBody,
  Portfolio,
  PortfolioList,
  PortfolioSummary,
} from '@astraq/shared';
import {
  CASH_PLACES,
  decimal,
  format,
  isZero,
  round,
  type Decimal,
} from '../common/decimal';
import { timeline } from '../ledger/activity';
import {
  LedgerError,
  deposit,
  positions,
  type LedgerState,
} from '../ledger/ledger';
import { sessionDate } from '../trading/market-hours';
import { valuePortfolio } from '../trading/valuation';
import { OrdersService } from './orders.service';
import {
  type PortfolioRow,
  PortfoliosRepository,
} from './portfolios.repository';

function toSummary(row: PortfolioRow): PortfolioSummary {
  return {
    id: row.id,
    name: row.name,
    slippageBps: row.slippageBps,
    commissionPerOrder: row.commissionPerOrder,
    commissionPerShare: row.commissionPerShare,
    maxOrderNotional: row.maxOrderNotional,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Paper portfolios: their settings, and their books as the ledger derives them. */
@Injectable()
export class PortfoliosService {
  constructor(
    private readonly portfolios: PortfoliosRepository,
    private readonly orders: OrdersService,
  ) {}

  async list(userId: string): Promise<PortfolioList> {
    const rows = await this.portfolios.findAll(userId);
    return { portfolios: rows.map(toSummary) };
  }

  /** Creates a portfolio with its opening deposit; 409 when the name is taken. */
  async create(
    userId: string,
    body: CreatePortfolioBody,
    now = new Date(),
  ): Promise<Portfolio> {
    const { startingCash, maxOrderNotional, ...settings } = body;
    const opening = isZero(decimal(startingCash)) ? null : deposit(startingCash);
    const row = await this.portfolios.create(
      userId,
      { ...settings, maxOrderNotional: maxOrderNotional ?? null },
      opening,
      now,
    );
    return this.withBooks(row, await this.orders.settle(userId, row.id, now), now);
  }

  /** A portfolio with its books, settled first; 404 when it isn't the user's. */
  async get(userId: string, id: string, now = new Date()): Promise<Portfolio> {
    const row = await this.owned(userId, id);
    return this.withBooks(row, await this.orders.settle(userId, id, now), now);
  }

  /**
   * Pays cash in or takes it out; 422 for a withdrawal the cash doesn't
   * cover. The move goes through the order path, which settles first: the
   * cash a withdrawal is checked against is what's left after every fill
   * that has already happened.
   */
  async transfer(
    userId: string,
    id: string,
    body: CashTransferBody,
    now = new Date(),
  ): Promise<Portfolio> {
    const row = await this.owned(userId, id);
    let state: LedgerState;
    try {
      state = await this.orders.transfer(userId, id, body, now);
    } catch (error) {
      if (error instanceof LedgerError && error.code === 'insufficient_cash') {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
    return this.withBooks(row, state, now);
  }

  /**
   * The portfolio's ledger as a timeline, newest first, settled first so
   * it ends on the cash `get` reports; 404 when it isn't the user's.
   */
  async activity(
    userId: string,
    id: string,
    now = new Date(),
  ): Promise<ActivityList> {
    await this.orders.settle(userId, id, now);
    const { history, tickers } = await this.portfolios.findHistory(id);
    return {
      activity: timeline(history)
        .reverse()
        .map(({ symbolId, occurredAt, ...line }) => ({
          ...line,
          occurredAt: occurredAt.toISOString(),
          ticker: symbolId === null ? null : (tickers.get(symbolId) ?? null),
        })),
    };
  }

  private async owned(userId: string, id: string): Promise<PortfolioRow> {
    const row = await this.portfolios.findOne(userId, id);
    if (!row) throw new NotFoundException(`Portfolio ${id} not found`);
    return row;
  }

  private async withBooks(
    row: PortfolioRow,
    state: LedgerState,
    now: Date,
  ): Promise<Portfolio> {
    const held = positions(state);
    // The lots are in the shares of `now`'s session, so the prices must be.
    const symbols = await this.portfolios.findHeldSymbols(
      held.map((position) => position.symbolId),
      sessionDate(now),
    );
    const value = valuePortfolio(
      state.cash,
      state.receivable,
      held.map((position) => {
        const price = symbols.get(position.symbolId)!.lastPrice;
        return { ...position, price: price === null ? null : decimal(price) };
      }),
    );
    const cents = (amount: Decimal) => format(round(amount, CASH_PLACES));
    const centsOrNull = (amount: Decimal | null) =>
      amount === null ? null : cents(amount);
    return {
      ...toSummary(row),
      cash: cents(state.cash),
      capital: cents(state.capital),
      fees: cents(state.fees),
      realizedPnl: cents(state.realizedPnl),
      dividendIncome: cents(state.dividendIncome),
      dividendsReceivable: cents(state.receivable),
      marketValue: centsOrNull(value.marketValue),
      unrealizedPnl: centsOrNull(value.unrealizedPnl),
      equity: centsOrNull(value.equity),
      positions: held
        .map((position, index) => ({
          ...symbols.get(position.symbolId)!,
          quantity: format(position.quantity),
          cost: cents(position.cost),
          marketValue: centsOrNull(value.holdings[index]!.marketValue),
          unrealizedPnl: centsOrNull(value.holdings[index]!.unrealizedPnl),
          lots: (state.lots.get(position.symbolId) ?? []).map((lot) => ({
            openedOn: lot.openedOn,
            quantity: format(lot.quantity),
            cost: cents(lot.cost),
          })),
        }))
        .sort((a, b) => (a.ticker < b.ticker ? -1 : 1)),
    };
  }
}
