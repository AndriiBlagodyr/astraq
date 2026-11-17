import { Module } from '@nestjs/common';
import { LedgerRepository } from './ledger.repository';

/**
 * Portfolio accounting (ADR 0009). No controller of its own: the order path
 * (`src/portfolios`) appends cash moves, fills, splits, and dividends
 * through `LedgerRepository` inside its own transaction. Nothing else
 * writes a ledger, so nothing can post without settling first.
 */
@Module({
  providers: [LedgerRepository],
  exports: [LedgerRepository],
})
export class LedgerModule {}
