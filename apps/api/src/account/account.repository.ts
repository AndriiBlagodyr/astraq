import { Injectable } from '@nestjs/common';
import { AuditAction, SessionRevokedReason } from '../generated/prisma/enums';
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

export class SessionNotFoundError extends Error {
  constructor(id: string) {
    super(`Session ${id} not found`);
  }
}

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

  async updateName(userId: string, name: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }

  /** The user's sessions that are neither revoked nor expired, newest first. */
  async findLiveSessions(userId: string, now: Date): Promise<SessionRow[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
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

  /**
   * Revokes one of the user's live sessions, with its audit entry. The
   * WHERE carries the user id, so a foreign or already revoked session
   * changes nothing and is reported as not found.
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.session.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: SessionRevokedReason.LOGOUT },
      });
      if (count === 0) throw new SessionNotFoundError(sessionId);
      await tx.auditLog.create({
        data: { userId, action: AuditAction.LOGOUT, metadata: { sessionId } },
      });
    });
  }
}
