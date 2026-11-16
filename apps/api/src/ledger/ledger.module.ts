import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { LedgerRepository } from './ledger.repository';
import { LedgerService } from './ledger.service';

/**
 * Portfolio accounting (ADR 0009). No controller of its own: the portfolio
 * endpoints post cash moves through `LedgerService`, and the order path
 * appends fills, splits, and dividends through `LedgerRepository` inside
 * its own transaction (`src/portfolios`).
 */
@Module({
  imports: [DatabaseModule],
  providers: [LedgerService, LedgerRepository],
  exports: [LedgerService, LedgerRepository],
})
export class LedgerModule {}
