import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { LedgerRepository } from './ledger.repository';
import { LedgerService } from './ledger.service';

/**
 * Portfolio accounting (ADR 0009). No controller of its own: the portfolio
 * and order endpoints (ROADMAP Phase 3 item 3) post through `LedgerService`.
 */
@Module({
  imports: [DatabaseModule],
  providers: [LedgerService, LedgerRepository],
  exports: [LedgerService],
})
export class LedgerModule {}
