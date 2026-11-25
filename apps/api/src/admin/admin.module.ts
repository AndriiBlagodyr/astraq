import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AdminGuard } from './admin.guard';
import { QueueAdminController } from './queue-admin.controller';
import { QueueAdminService } from './queue-admin.service';

/** What only an operator sees: the job queue now, users in Phase 7. */
@Module({
  imports: [DatabaseModule],
  controllers: [QueueAdminController],
  providers: [QueueAdminService, AdminGuard],
})
export class AdminModule {}
