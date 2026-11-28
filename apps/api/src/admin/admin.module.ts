import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AdminGuard } from './admin.guard';
import { QueueAdminController } from './queue-admin.controller';
import { QueueAdminService } from './queue-admin.service';
import { ReviewAccessController } from './review-access.controller';
import { ReviewAccessRepository } from './review-access.repository';
import { ReviewAccessService } from './review-access.service';

/** What only an operator sees: the job queue and the review accounts. */
@Module({
  imports: [DatabaseModule],
  controllers: [QueueAdminController, ReviewAccessController],
  providers: [
    QueueAdminService,
    ReviewAccessService,
    ReviewAccessRepository,
    AdminGuard,
  ],
})
export class AdminModule {}
