import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  CashTransferBody,
  CreatePortfolioBody,
  Portfolio,
  PortfolioList,
  PortfolioSummary,
} from '@astraq/shared';
import { CASH_PLACES, format, isZero, decimal, round } from '../common/decimal';
import { LedgerError, deposit, positions } from '../ledger/ledger';
import { LedgerService } from '../ledger/ledger.service';
import { OrdersService } from './orders.service';
import {
  PortfolioNameTakenError,
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Paper portfolios: their settings, and their books as the ledger derives them. */
@Injectable()
export class PortfoliosService {
  constructor(
    private readonly portfolios: PortfoliosRepository,
    private readonly ledger: LedgerService,
    private readonly orders: OrdersService,
  ) {}

  async list(userId: string): Promise<PortfolioList> {
    const rows = await this.portfolios.findAll(userId);
    return { portfolios: rows.map(toSummary) };
  }

  /** Creates a portfolio with its opening deposit; 409 when the name is taken. */
  async create(userId: string, body: CreatePortfolioBody): Promise<Portfolio> {
    const { startingCash, ...settings } = body;
    const opening = isZero(decimal(startingCash)) ? null : deposit(startingCash);
    let row: PortfolioRow;
    try {
      row = await this.portfolios.create(userId, settings, opening, new Date());
    } catch (error) {
      if (error instanceof PortfolioNameTakenError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
    return this.withBooks(userId, row);
  }

  /** A portfolio with its books, settled first; 404 when it isn't the user's. */
  async get(userId: string, id: string): Promise<Portfolio> {
    return this.withBooks(userId, await this.owned(userId, id));
  }

  /** Pays cash in or takes it out; 422 for a withdrawal the cash doesn't cover. */
  async transfer(
    userId: string,
    id: string,
    body: CashTransferBody,
  ): Promise<Portfolio> {
    const row = await this.owned(userId, id);
    try {
      if (body.type === 'deposit') await this.ledger.deposit(id, body.amount);
      else await this.ledger.withdraw(id, body.amount);
    } catch (error) {
      if (error instanceof LedgerError && error.code === 'insufficient_cash') {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
    return this.withBooks(userId, row);
  }

  private async owned(userId: string, id: string): Promise<PortfolioRow> {
    const row = await this.portfolios.findOne(userId, id);
    if (!row) throw new NotFoundException(`Portfolio ${id} not found`);
    return row;
  }

  private async withBooks(userId: string, row: PortfolioRow): Promise<Portfolio> {
    const state = await this.orders.settle(userId, row.id);
    const held = positions(state);
    const symbols = await this.portfolios.findSymbols(
      held.map((position) => position.symbolId),
    );
    const cents = (value: Parameters<typeof round>[0]) =>
      format(round(value, CASH_PLACES));
    return {
      ...toSummary(row),
      cash: cents(state.cash),
      capital: cents(state.capital),
      fees: cents(state.fees),
      realizedPnl: cents(state.realizedPnl),
      dividendIncome: cents(state.dividendIncome),
      dividendsReceivable: cents(state.receivable),
      positions: held
        .map((position) => ({
          ticker: symbols.get(position.symbolId)!.ticker,
          name: symbols.get(position.symbolId)!.name,
          quantity: format(position.quantity),
          cost: cents(position.cost),
        }))
        .sort((a, b) => (a.ticker < b.ticker ? -1 : 1)),
    };
  }
}
