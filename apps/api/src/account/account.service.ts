import { Injectable, NotFoundException } from '@nestjs/common';
import type { Account, AccountSession, AccountSessionList } from '@astraq/shared';
import { AuthRepository } from '../auth/auth.repository';
import { SessionRevokedReason } from '../generated/prisma/enums';
import { AccountRepository } from './account.repository';

@Injectable()
export class AccountService {
  constructor(
    private readonly account: AccountRepository,
    private readonly auth: AuthRepository,
  ) {}

  async get(userId: string): Promise<Account> {
    const user = await this.account.findUser(userId);
    // A valid token for a deleted user: the session outlived the account.
    if (!user) throw new NotFoundException('Account not found');
    return { ...user, createdAt: user.createdAt.toISOString() };
  }

  /** An empty name clears it: the column keeps null for "not set". */
  async updateName(userId: string, name: string): Promise<Account> {
    const user = await this.account.updateName(userId, name || null);
    if (!user) throw new NotFoundException('Account not found');
    return { ...user, createdAt: user.createdAt.toISOString() };
  }

  async listSessions(userId: string, currentSessionId: string): Promise<AccountSessionList> {
    const rows = await this.account.findLiveSessions(userId, new Date());
    const sessions: AccountSession[] = rows.map((row) => ({
      id: row.id,
      current: row.id === currentSessionId,
      userAgent: row.userAgent,
      ip: row.ip,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
    }));
    return { sessions };
  }

  /**
   * Signs one device out: the same revocation as that device's own logout.
   * A foreign or already revoked session is a 404.
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const revoked = await this.auth.revokeSession(
      sessionId,
      SessionRevokedReason.LOGOUT,
      userId,
    );
    if (!revoked) throw new NotFoundException('Session not found');
  }
}
