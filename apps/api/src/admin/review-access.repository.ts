import { Injectable } from '@nestjs/common';
import { revokeLiveSessions } from '../auth/auth.repository';
import { ConflictError, NotFoundError } from '../common/domain-errors';
import { isUniqueViolation } from '../common/prisma-errors';
import { PrismaService } from '../database/prisma.service';
import { AuditAction, SessionRevokedReason } from '../generated/prisma/enums';

export class ReviewAccessNotFoundError extends NotFoundError {
  override name = 'ReviewAccessNotFoundError';
  constructor() {
    super('Review account not found');
  }
}

export class EmailTakenError extends ConflictError {
  override name = 'EmailTakenError';
  constructor() {
    super('An account with this email already exists');
  }
}

/** A review account as the admin pages read it. */
export type ReviewAccessRow = {
  userId: string;
  email: string;
  company: string;
  note: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  sharedCredentials: boolean;
  mustChangePassword: boolean;
  passwordChangedAt: Date | null;
  createdAt: Date;
  /** The newest session's start; null when nobody has signed in. */
  lastSignInAt: Date | null;
};

const withUser = {
  user: {
    select: {
      email: true,
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  },
} as const;

type Loaded = {
  userId: string;
  company: string;
  note: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  sharedCredentials: boolean;
  mustChangePassword: boolean;
  passwordChangedAt: Date | null;
  createdAt: Date;
  user: { email: string; sessions: { createdAt: Date }[] };
};

const toRow = ({ user, ...access }: Loaded): ReviewAccessRow => ({
  userId: access.userId,
  email: user.email,
  company: access.company,
  note: access.note,
  expiresAt: access.expiresAt,
  revokedAt: access.revokedAt,
  sharedCredentials: access.sharedCredentials,
  mustChangePassword: access.mustChangePassword,
  passwordChangedAt: access.passwordChangedAt,
  createdAt: access.createdAt,
  lastSignInAt: user.sessions[0]?.createdAt ?? null,
});

/**
 * Review accounts, for the admin endpoints. Each write is one transaction
 * that also ends the sessions it must end and records itself in the audit
 * log, with the admin who did it under `metadata.by`.
 */
@Injectable()
export class ReviewAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<ReviewAccessRow[]> {
    const rows = await this.prisma.reviewAccess.findMany({
      orderBy: { createdAt: 'desc' },
      include: withUser,
    });
    return rows.map(toRow);
  }

  private async read(userId: string): Promise<ReviewAccessRow> {
    const row = await this.prisma.reviewAccess.findUnique({
      where: { userId },
      include: withUser,
    });
    if (!row) throw new ReviewAccessNotFoundError();
    return toRow(row);
  }

  /** The user and its review access together, or neither. */
  async create(input: {
    email: string;
    passwordHash: string;
    company: string;
    note: string | null;
    expiresAt: Date;
    sharedCredentials: boolean;
    createdBy: string;
  }): Promise<ReviewAccessRow> {
    try {
      const userId = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email: input.email, passwordHash: input.passwordHash },
        });
        await tx.reviewAccess.create({
          data: {
            userId: user.id,
            company: input.company,
            note: input.note,
            expiresAt: input.expiresAt,
            sharedCredentials: input.sharedCredentials,
            mustChangePassword: !input.sharedCredentials,
            createdBy: input.createdBy,
          },
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: AuditAction.REVIEW_ACCESS_CREATED,
            metadata: { by: input.createdBy, company: input.company },
          },
        });
        return user.id;
      });
      return await this.read(userId);
    } catch (error) {
      if (isUniqueViolation(error)) throw new EmailTakenError();
      throw error;
    }
  }

  /** A new end date. It reopens an account that was closed. */
  async setExpiry(
    userId: string,
    expiresAt: Date,
    by: string,
  ): Promise<ReviewAccessRow> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.reviewAccess.updateMany({
        where: { userId },
        data: { expiresAt, revokedAt: null },
      });
      if (count === 0) throw new ReviewAccessNotFoundError();
      await tx.auditLog.create({
        data: {
          userId,
          action: AuditAction.REVIEW_ACCESS_UPDATED,
          metadata: { by, expiresAt: expiresAt.toISOString() },
        },
      });
    });
    return this.read(userId);
  }

  /**
   * Closes the account and ends its sessions. Closing one that is closed
   * already changes nothing: it keeps the time it was first closed.
   */
  async revoke(userId: string, by: string, now: Date): Promise<ReviewAccessRow> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.reviewAccess.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      if (count === 0) {
        const exists = await tx.reviewAccess.findUnique({
          where: { userId },
          select: { userId: true },
        });
        if (!exists) throw new ReviewAccessNotFoundError();
        return;
      }
      await revokeLiveSessions(
        tx,
        userId,
        SessionRevokedReason.ACCESS_CLOSED,
        now,
      );
      await tx.auditLog.create({
        data: {
          userId,
          action: AuditAction.REVIEW_ACCESS_REVOKED,
          metadata: { by },
        },
      });
    });
    return this.read(userId);
  }

  /**
   * Stores a new handed-out password and ends the sessions. An account
   * whose password is its user's own must replace this one at the next
   * sign-in, as it did the first.
   */
  async resetPassword(
    userId: string,
    passwordHash: string,
    by: string,
    now: Date,
  ): Promise<ReviewAccessRow> {
    await this.prisma.$transaction(async (tx) => {
      const access = await tx.reviewAccess.findUnique({
        where: { userId },
        select: { sharedCredentials: true },
      });
      if (!access) throw new ReviewAccessNotFoundError();
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await tx.reviewAccess.update({
        where: { userId },
        data: {
          mustChangePassword: !access.sharedCredentials,
          passwordChangedAt: null,
        },
      });
      await revokeLiveSessions(
        tx,
        userId,
        SessionRevokedReason.PASSWORD_CHANGED,
        now,
      );
      await tx.auditLog.create({
        data: {
          userId,
          action: AuditAction.PASSWORD_RESET,
          metadata: { by },
        },
      });
    });
    return this.read(userId);
  }
}
