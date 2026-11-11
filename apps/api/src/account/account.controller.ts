import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
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
import {
  AccountDto,
  AccountSessionListDto,
  SessionIdParamDto,
  UpdateAccountBodyDto,
} from './account.dto';
import { AccountService } from './account.service';

// The signed-in user's own account (docs/ui-plan.md § Settings). "Log out
// everywhere" stays on /auth/logout-all; this adds the per-device list and
// revoking one device from another.
@ApiTags('account')
@ApiBearerAuth()
@ApiProblemResponses()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get()
  @ApiOperation({ operationId: 'getAccount', summary: 'The signed-in user’s profile' })
  @ZodResponse({ status: 200, type: AccountDto })
  get(@Req() req: AuthenticatedRequest) {
    return this.account.get(req.user.sub);
  }

  @Patch()
  @ApiOperation({ operationId: 'updateAccount', summary: 'Set or clear the display name' })
  @ZodResponse({ status: 200, type: AccountDto })
  update(@Req() req: AuthenticatedRequest, @Body() body: UpdateAccountBodyDto) {
    return this.account.updateName(req.user.sub, body.name);
  }

  @Get('sessions')
  @ApiOperation({
    operationId: 'listSessions',
    summary: 'The signed-in devices: live sessions, newest first',
  })
  @ZodResponse({ status: 200, type: AccountSessionListDto })
  listSessions(@Req() req: AuthenticatedRequest) {
    return this.account.listSessions(req.user.sub, req.user.sid);
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  @ApiOperation({
    operationId: 'revokeSession',
    summary: 'Sign one device out (the current one included)',
  })
  revokeSession(
    @Req() req: AuthenticatedRequest,
    @Param() { id }: SessionIdParamDto,
  ) {
    return this.account.revokeSession(req.user.sub, id);
  }
}
