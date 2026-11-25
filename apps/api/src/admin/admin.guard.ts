import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { env } from '../common/env';
import { PrismaService } from '../database/prisma.service';

/**
 * Lets through the users named in `ADMIN_EMAILS`, and nobody when it is
 * empty. Runs after `JwtAuthGuard`, which says who is asking.
 *
 * There are no roles yet (Phase 7 adds them with `/admin/users`), so "an
 * admin" is an operator's setting, like the invite list: it can't be
 * granted or lost through the app. The email is read from the database on
 * each request, not carried in the token: an address taken off the list
 * loses access on the next restart, not when a token happens to expire.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const admins = env.ADMIN_EMAILS;
    if (admins.length > 0) {
      const row = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { email: true },
      });
      if (row !== null && admins.includes(row.email)) return true;
    }
    throw new ForbiddenException('Admins only');
  }
}
