import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthTokens, LoginBody, RefreshBody, RegisterBody } from '@astraq/shared';
import { AuditAction, SessionRevokedReason } from '../generated/prisma/enums';
import { env } from '../common/env';
import { signJwt } from './jwt';
import { hashPassword, needsRehash, verifyPassword } from './password';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
  sessionExpiresAt,
} from './token';
import { AuthRepository } from './auth.repository';

// Computed once at startup so unknown-email login takes the same time as a
// known one. A module-level variable avoids an async constructor.
let dummyHash: string | null = null;
async function getDummyHash(): Promise<string> {
  if (!dummyHash) dummyHash = await hashPassword('dummy-password-for-timing-guard');
  return dummyHash;
}

@Injectable()
export class AuthService {
  constructor(private readonly auth: AuthRepository) {}

  async register(
    body: RegisterBody,
    context: { ip: string | null; userAgent: string | null },
  ): Promise<AuthTokens> {
    if (!env.INVITE_EMAILS.includes(body.email)) {
      throw new ConflictException('Registration is currently invite-only');
    }

    const existing = await this.auth.findUserByEmail(body.email);
    if (existing) {
      throw new ConflictException('Registration is currently invite-only');
    }

    const passwordHash = await hashPassword(body.password);
    const user = await this.auth.createUser(body.email, passwordHash);

    await this.auth.appendAuditLog({
      userId: user.id,
      action: AuditAction.REGISTER,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {},
    });

    return this.issueTokens(user.id, context);
  }

  async login(
    body: LoginBody,
    context: { ip: string | null; userAgent: string | null },
  ): Promise<AuthTokens> {
    const user = await this.auth.findUserByEmail(body.email);

    const storedHash = user?.passwordHash ?? (await getDummyHash());
    const valid = await verifyPassword(storedHash, body.password);

    if (!user || !valid) {
      await this.auth.appendAuditLog({
        userId: user?.id ?? null,
        action: AuditAction.LOGIN_FAILED,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { email: body.email },
      });
      throw new UnauthorizedException('Email or password is incorrect');
    }

    await this.auth.appendAuditLog({
      userId: user.id,
      action: AuditAction.LOGIN_SUCCEEDED,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {},
    });

    if (needsRehash(user.passwordHash)) {
      const newHash = await hashPassword(body.password);
      await this.auth.updatePasswordHash(user.id, newHash);
    }

    return this.issueTokens(user.id, context);
  }

  async refresh(body: RefreshBody): Promise<AuthTokens> {
    const tokenHash = hashRefreshToken(body.refreshToken);
    const newRawToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(newRawToken);
    const now = new Date();
    const newExpiry = refreshTokenExpiresAt(now, sessionExpiresAt(now));

    const { sessionId, userId } = await this.auth.rotateRefreshToken(
      tokenHash,
      newTokenHash,
      newExpiry,
      now,
    );

    const nowSec = Math.floor(now.getTime() / 1000);
    const accessToken = signJwt(userId, sessionId, env.JWT_SECRET, nowSec);
    return { accessToken, refreshToken: newRawToken };
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    await this.auth.revokeSession(sessionId, SessionRevokedReason.LOGOUT, userId);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.auth.revokeAllUserSessions(userId);
  }

  private async issueTokens(
    userId: string,
    context: { ip: string | null; userAgent: string | null },
  ): Promise<AuthTokens> {
    const now = new Date();
    const sessExp = sessionExpiresAt(now);
    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);
    const tokenExp = refreshTokenExpiresAt(now, sessExp);

    const { sessionId } = await this.auth.createSessionWithToken(
      userId,
      tokenHash,
      sessExp,
      tokenExp,
      context.ip,
      context.userAgent,
    );

    const nowSec = Math.floor(now.getTime() / 1000);
    const accessToken = signJwt(userId, sessionId, env.JWT_SECRET, nowSec);
    return { accessToken, refreshToken: rawToken };
  }
}
