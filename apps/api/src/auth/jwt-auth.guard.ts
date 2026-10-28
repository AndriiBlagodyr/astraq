import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { env } from '../common/env';
import { verifyJwt } from './jwt';

export interface AuthenticatedRequest extends Request {
  user: { sub: string; sid: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
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

    req.user = { sub: result.payload.sub, sid: result.payload.sid };
    return true;
  }
}
