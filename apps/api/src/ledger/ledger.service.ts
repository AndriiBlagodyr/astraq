import { Injectable } from '@nestjs/common';
import {
  apply,
  buy,
  deposit,
  replay,
  sell,
  withdrawal,
  type LedgerState,
  type LedgerTransaction,
  type Posting,
  type Trade,
} from './ledger';
import { LedgerRepository } from './ledger.repository';

/**
 * A portfolio's books: derives its state from the ledger and appends to it.
 * The only writer of the ledger tables. Rule violations surface as
 * `LedgerError` (insufficient cash or shares), for the caller to turn into
 * an order rejection or a 4xx.
 */
@Injectable()
export class LedgerService {
  constructor(private readonly ledger: LedgerRepository) {}

  /** Cash, lots, and realized PnL, replayed from the stored entries. */
  async state(portfolioId: string): Promise<LedgerState> {
    return replay(await this.ledger.findTransactions(portfolioId));
  }

  deposit(portfolioId: string, amount: string, occurredAt = new Date()) {
    return this.post(portfolioId, occurredAt, () => deposit(amount));
  }

  withdraw(portfolioId: string, amount: string, occurredAt = new Date()) {
    return this.post(portfolioId, occurredAt, (state) =>
      withdrawal(state, amount),
    );
  }

  recordBuy(portfolioId: string, trade: Trade, occurredAt: Date) {
    return this.post(portfolioId, occurredAt, (state) => buy(state, trade));
  }

  recordSell(portfolioId: string, trade: Trade, occurredAt: Date) {
    return this.post(portfolioId, occurredAt, (state) => sell(state, trade));
  }

  private post(
    portfolioId: string,
    occurredAt: Date,
    build: (state: LedgerState) => Posting,
  ): Promise<LedgerTransaction> {
    return this.ledger.append(portfolioId, occurredAt, (history) => {
      const state = replay(history);
      const posting = build(state);
      // Run the new transaction through the same audit a later replay
      // will, so nothing is stored that couldn't be read back.
      apply(state, { seq: history.length + 1, ...posting });
      return posting;
    });
  }
}
