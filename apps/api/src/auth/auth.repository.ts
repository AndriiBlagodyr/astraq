import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { AuditAction, SessionRevokedReason } from '../generated/prisma/enums';
import { isUniqueViolation } from '../common/prisma-errors';
import { PrismaService } from '../database/prisma.service';

const GRACE_WINDOW_MS = 10_000;

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

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
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
    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now, revokedReason: SessionRevokedReason.LOGOUT_ALL },
      }),
      this.prisma.auditLog.create({
        data: { userId, action: AuditAction.LOGOUT_ALL, metadata: {} },
      }),
    ]);
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
