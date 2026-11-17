import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/** A live session as the "your devices" list needs it. */
export type SessionRow = {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
  /** The newest refresh token's issue time: the last time the session was used. */
  lastUsedAt: Date;
  expiresAt: Date;
};

/**
 * The signed-in user's own rows. Every query is scoped by the caller's
 * user id, like the watchlists repository: another user's session id
 * reads as "not found", never as someone else's device.
 */
@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }

  /** Null when the user is gone (a valid token that outlived the account). */
  async updateName(userId: string, name: string | null) {
    const { count } = await this.prisma.user.updateMany({
      where: { id: userId },
      data: { name },
    });
    return count === 0 ? null : this.findUser(userId);
  }

  /**
   * The user's sessions that can still sign in, newest first: not revoked,
   * not expired, and holding a refresh token that hasn't expired. Sessions
   * last 90 days but a refresh token 30, so a device idle for longer than
   * that is signed out already and doesn't belong on the list.
   */
  async findLiveSessions(userId: string, now: Date): Promise<SessionRow[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
        refreshTokens: { some: { expiresAt: { gt: now } } },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ip: true,
        createdAt: true,
        expiresAt: true,
        // Each rotation issues a token, so the newest one dates the last use.
        refreshTokens: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });
    return sessions.map(({ refreshTokens, ...session }) => ({
      ...session,
      lastUsedAt: refreshTokens[0]?.createdAt ?? session.createdAt,
    }));
  }
}
