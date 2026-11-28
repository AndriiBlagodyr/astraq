import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../auth/jwt-auth.guard';
import { ApiProblemResponses } from '../common/problem';
import { AdminGuard } from './admin.guard';
import {
  CreateReviewAccessBodyDto,
  ReviewAccessCredentialsDto,
  ReviewAccessDto,
  ReviewAccessIdParamDto,
  ReviewAccessListDto,
  UpdateReviewAccessBodyDto,
} from './admin.dto';
import { ReviewAccessService } from './review-access.service';

/**
 * Review accounts, for the web's `/admin/access` page (ROADMAP "Review
 * access" side track). A 401 without a session, a 403 for a user who isn't
 * in `ADMIN_EMAILS`.
 */
@ApiTags('admin')
@ApiBearerAuth()
@ApiProblemResponses()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/access')
export class ReviewAccessController {
  constructor(private readonly access: ReviewAccessService) {}

  @Get()
  @ApiOperation({
    operationId: 'listReviewAccess',
    summary: 'Every review account, newest first',
  })
  @ZodResponse({ status: 200, type: ReviewAccessListDto })
  list() {
    return this.access.list();
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({
    operationId: 'createReviewAccess',
    summary: 'Make a review account; its password is in this answer only',
  })
  @ZodResponse({ status: 201, type: ReviewAccessCredentialsDto })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateReviewAccessBodyDto,
  ) {
    return this.access.create(body, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({
    operationId: 'updateReviewAccess',
    summary: 'Set a new end date, reopening the account if it was closed',
  })
  @ZodResponse({ status: 200, type: ReviewAccessDto })
  update(
    @Req() req: AuthenticatedRequest,
    @Param() { id }: ReviewAccessIdParamDto,
    @Body() body: UpdateReviewAccessBodyDto,
  ) {
    return this.access.setExpiry(id, body.expiresAt, req.user.sub);
  }

  @Post(':id/revoke')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'revokeReviewAccess',
    summary: 'Close the account and end its sessions',
  })
  @ZodResponse({ status: 200, type: ReviewAccessDto })
  revoke(
    @Req() req: AuthenticatedRequest,
    @Param() { id }: ReviewAccessIdParamDto,
  ) {
    return this.access.revoke(id, req.user.sub);
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'resetReviewAccessPassword',
    summary: 'Give the account a new password; it is in this answer only',
  })
  @ZodResponse({ status: 200, type: ReviewAccessCredentialsDto })
  resetPassword(
    @Req() req: AuthenticatedRequest,
    @Param() { id }: ReviewAccessIdParamDto,
  ) {
    return this.access.resetPassword(id, req.user.sub);
  }
}
