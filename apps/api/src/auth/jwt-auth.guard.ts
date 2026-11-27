import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { env } from '../common/env';
import { verifyJwt } from './jwt';

export interface AuthenticatedRequest extends Request {
  user: { sub: string; sid: string };
}

const BEFORE_PASSWORD_CHANGE = 'auth:before-password-change';

/**
 * Marks a route a session may use while its password still has to be
 * replaced (a review account's first sign-in): changing the password,
 * reading who is signed in, and signing out. Everything else is a 403
 * until the change is made.
 */
export const AllowBeforePasswordChange = () =>
  SetMetadata(BEFORE_PASSWORD_CHANGE, true);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { sub: string; sid: string } }>();
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();

    const token = auth.slice(7);
    const nowSec = Math.floor(Date.now() / 1000);
    const result = verifyJwt(token, env.JWT_SECRET, nowSec);
    if (!result.ok) throw new UnauthorizedException();

    if (
      result.payload.pwd === true &&
      !this.reflector.get<boolean>(BEFORE_PASSWORD_CHANGE, context.getHandler())
    ) {
      throw new ForbiddenException('Change your password to continue');
    }

    req.user = { sub: result.payload.sub, sid: result.payload.sid };
    return true;
  }
}
