import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiProblemResponses } from '../common/problem';
import { AdminGuard } from './admin.guard';
import { QueueStatusDto, RetryDeadResultDto } from './admin.dto';
import { QueueAdminService } from './queue-admin.service';

/**
 * The job queue for the people who run the app (ROADMAP Phase 4 item 8):
 * what the `jobs status` and `jobs dead` commands print, over HTTP, for the
 * web's `/admin/queue` page. A 401 without a session, a 403 for a user who
 * isn't in `ADMIN_EMAILS`.
 *
 * Written by hand, not Bull Board: that is a web app of its own to mount
 * and to protect, and this api's sessions are bearer tokens the browser
 * never holds, so it would need a second way to sign in.
 */
@ApiTags('admin')
@ApiBearerAuth()
@ApiProblemResponses()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/queue')
export class QueueAdminController {
  constructor(private readonly queue: QueueAdminService) {}

  @Get()
  @ApiOperation({
    operationId: 'getQueueStatus',
    summary: 'The market data job queue: counts, and the jobs worth a look',
  })
  @ZodResponse({ status: 200, type: QueueStatusDto })
  status() {
    return this.queue.status();
  }

  @Post('dead/retry')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'retryDeadJobs',
    summary: 'Put every dead-lettered job back on the queue',
  })
  @ZodResponse({ status: 200, type: RetryDeadResultDto })
  retryDead() {
    return this.queue.retryDead();
  }
}
