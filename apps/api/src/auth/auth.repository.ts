import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { AuditAction, SessionRevokedReason } from '../generated/prisma/enums';
import { isUniqueViolation } from '../common/prisma-errors';
import { PrismaService } from '../database/prisma.service';

const GRACE_WINDOW_MS = 10_000;

/**
 * Ends every live session of a user, inside the caller's transaction.
 * Shared by the password change here and the admin's revoke and reset
 * (admin/review-access.repository.ts). It writes no audit row: each caller
 * records what it did under its own action.
 */
export async function revokeLiveSessions(
  tx: Prisma.TransactionClient,
  userId: string,
  reason: SessionRevokedReason,
  now: Date,
): Promise<void> {
  await tx.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now, revokedReason: reason },
  });
}

interface RefreshTokenRow {
  id: string;
  session_id: string;
  token_hash: Uint8Array<ArrayBuffer>;
  parent_id: string | null;
  expires_at: Date;
  rotated_at: Date | null;
  created_at: Date;
  user_id: string;
  session_expires_at: Date;
  revoked_at: Date | null;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** With its review access, which login checks before letting anyone in. */
  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { reviewAccess: true },
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { reviewAccess: true },
    });
  }

  /** Null for an ordinary account. */
  async findReviewAccess(userId: string) {
    return this.prisma.reviewAccess.findUnique({ where: { userId } });
  }

  /**
   * Stores a password its owner chose and ends every session of the
   * account, the caller's included: whoever else held the old password is
   * signed out, and the caller is given a new session afterwards. On a
   * review account this also settles "must change password".
   */
  async changePassword(userId: string, passwordHash: string, now: Date) {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await tx.reviewAccess.updateMany({
        where: { userId },
        data: { mustChangePassword: false, passwordChangedAt: now },
      });
      await revokeLiveSessions(
        tx,
        userId,
        SessionRevokedReason.PASSWORD_CHANGED,
        now,
      );
      await tx.auditLog.create({
        data: { userId, action: AuditAction.PASSWORD_CHANGED, metadata: {} },
      });
    });
  }

  /** A closed review account presented a live refresh token: end it there. */
  async closeSessions(userId: string, state: string, now: Date) {
    await this.prisma.$transaction(async (tx) => {
      await revokeLiveSessions(
        tx,
        userId,
        SessionRevokedReason.ACCESS_CLOSED,
        now,
      );
      await tx.auditLog.create({
        data: {
          userId,
          action: AuditAction.REVIEW_ACCESS_REFUSED,
          metadata: { state, at: 'refresh' },
        },
      });
    });
  }

  /** The new user, or null when the email was registered in the meantime. */
  async createUser(email: string, passwordHash: string) {
    try {
      return await this.prisma.user.create({ data: { email, passwordHash } });
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  /** Creates a session and its first refresh token atomically. */
  async createSessionWithToken(
    userId: string,
    tokenHash: Uint8Array<ArrayBuffer>,
    sessionExpiresAt: Date,
    tokenExpiresAt: Date,
    ip: string | null,
    userAgent: string | null,
  ): Promise<{ sessionId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.session.create({
        data: { userId, expiresAt: sessionExpiresAt, ip, userAgent },
      });
      await tx.refreshToken.create({
        data: { sessionId: session.id, tokenHash, expiresAt: tokenExpiresAt },
      });
      return { sessionId: session.id };
    });
  }

  /**
   * Rotates a refresh token inside a transaction with a row-level lock.
   * Throws UnauthorizedException on any invalid condition, including reuse.
   * Reuse revoke+audit must commit before the throw: an exception inside
   * `$transaction` would roll the revoke back.
   */
  async rotateRefreshToken(
    tokenHash: Uint8Array<ArrayBuffer>,
    newTokenHash: Uint8Array<ArrayBuffer>,
    newTokenExpiresAt: Date,
    now: Date,
  ): Promise<{ sessionId: string; userId: string; newTokenExpiresAt: Date }> {
    const outcome = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<RefreshTokenRow[]>`
        SELECT
          rt.id, rt.session_id, rt.token_hash, rt.parent_id,
          rt.expires_at, rt.rotated_at, rt.created_at,
          s.user_id, s.expires_at AS session_expires_at, s.revoked_at
        FROM refresh_tokens rt
        JOIN sessions s ON s.id = rt.session_id
        WHERE rt.token_hash = ${tokenHash}
        FOR UPDATE OF rt
      `;

      if (rows.length === 0) throw new UnauthorizedException();
      const rt = rows[0]!;

      if (rt.revoked_at !== null) throw new UnauthorizedException();
      if (rt.session_expires_at <= now) throw new UnauthorizedException();
      if (rt.expires_at <= now) throw new UnauthorizedException();

      const cap = (exp: Date) =>
        exp < rt.session_expires_at ? exp : rt.session_expires_at;

      if (rt.rotated_at !== null) {
        const graceCutoff = new Date(rt.rotated_at.getTime() + GRACE_WINDOW_MS);
        if (now > graceCutoff) {
          await tx.session.update({
            where: { id: rt.session_id },
            data: {
              revokedAt: now,
              revokedReason: SessionRevokedReason.REUSE_DETECTED,
            },
          });
          await tx.auditLog.create({
            data: {
              userId: rt.user_id,
              action: AuditAction.REFRESH_REUSED,
              metadata: { sessionId: rt.session_id },
            },
          });
          return { kind: 'reuse_detected' as const };
        }
        // Inside the grace window: the token stays rotated as it was, and
        // the child below is a sibling of the one issued the first time.
      } else {
        // Normal rotation: mark this token rotated.
        await tx.refreshToken.update({
          where: { id: rt.id },
          data: { rotatedAt: now },
        });
      }

      const effectiveExpiry = cap(newTokenExpiresAt);
      await tx.refreshToken.create({
        data: {
          sessionId: rt.session_id,
          tokenHash: newTokenHash,
          parentId: rt.id,
          expiresAt: effectiveExpiry,
        },
      });
      return {
        kind: 'rotated' as const,
        sessionId: rt.session_id,
        userId: rt.user_id,
        newTokenExpiresAt: effectiveExpiry,
      };
    });

    if (outcome.kind === 'reuse_detected') {
      throw new UnauthorizedException();
    }
    return outcome;
  }

  /**
   * Revokes the user's session if it is still live. One that is already
   * revoked keeps its first reason and time: a logout sent with an access
   * token that outlived a `REUSE_DETECTED` revocation mustn't rewrite it.
   *
   * The WHERE carries the user id, so a foreign session changes nothing.
   * Returns whether a session was revoked: logout doesn't care, and
   * "sign this device out" reports false as not found.
   */
  async revokeSession(
    sessionId: string,
    reason: SessionRevokedReason,
    userId: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.session.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: reason },
      });
      if (count === 0) return false;
      await tx.auditLog.create({
        data: { userId, action: AuditAction.LOGOUT, metadata: { sessionId } },
      });
      return true;
    });
  }

  async revokeAllUserSessions(userId: string) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await revokeLiveSessions(tx, userId, SessionRevokedReason.LOGOUT_ALL, now);
      await tx.auditLog.create({
        data: { userId, action: AuditAction.LOGOUT_ALL, metadata: {} },
      });
    });
  }

  async appendAuditLog(data: {
    userId: string | null;
    action: AuditAction;
    ip: string | null;
    userAgent: string | null;
    metadata: Prisma.InputJsonValue;
  }) {
    await this.prisma.auditLog.create({ data });
  }
}
