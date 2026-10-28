import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { Request } from 'express';
import { ApiProblemResponses } from '../common/problem';
import { AuthTokensDto, LoginBodyDto, RefreshBodyDto, RegisterBodyDto } from './auth.dto';
import { AuthService } from './auth.service';
import { type AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@ApiProblemResponses()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  @ApiOperation({ operationId: 'register', summary: 'Register with an invited email' })
  @ZodResponse({ status: 201, type: AuthTokensDto })
  register(@Body() body: RegisterBodyDto, @Req() req: Request) {
    return this.authService.register(body, {
      ip: req.ip ?? null,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
    });
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ operationId: 'login', summary: 'Sign in with email and password' })
  @ZodResponse({ status: 200, type: AuthTokensDto })
  login(@Body() body: LoginBodyDto, @Req() req: Request) {
    return this.authService.login(body, {
      ip: req.ip ?? null,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
    });
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ operationId: 'refreshTokens', summary: 'Exchange a refresh token for new tokens' })
  @ZodResponse({ status: 200, type: AuthTokensDto })
  refresh(@Body() body: RefreshBodyDto) {
    return this.authService.refresh(body);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'logout', summary: 'Revoke the current session' })
  logout(@Req() req: AuthenticatedRequest) {
    return this.authService.logout(req.user.sid, req.user.sub);
  }

  @Post('logout-all')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'logoutAll', summary: 'Revoke every session for this user' })
  logoutAll(@Req() req: AuthenticatedRequest) {
    return this.authService.logoutAll(req.user.sub);
  }
}
