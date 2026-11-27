import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  AuthTokens,
  ChangePasswordBody,
  LoginBody,
  RefreshBody,
  RegisterBody,
} from '@astraq/shared';
import { AuditAction, SessionRevokedReason } from '../generated/prisma/enums';
import { env } from '../common/env';
import { type JwtClaims, signJwt } from './jwt';
import { accessState } from './review-access';
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

type RequestContext = { ip: string | null; userAgent: string | null };

/** The review access columns a token is shaped by; null for an ordinary account. */
type ReviewAccessRow = {
  expiresAt: Date;
  revokedAt: Date | null;
  mustChangePassword: boolean;
} | null;

/**
 * A review account's token says when the password must be replaced and
 * never outlives the account's end date, so an account that runs out stops
 * at that time, not up to ten minutes later.
 */
function claimsFor(review: ReviewAccessRow): JwtClaims {
  if (!review) return {};
  return {
    mustChangePassword: review.mustChangePassword,
    notAfter: review.expiresAt,
  };
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
    // Two registrations raced past the check above: the second loses.
    if (!user) {
      throw new ConflictException('Registration is currently invite-only');
    }

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

    // A closed review account gets the answer a wrong password gets: the
    // response doesn't say the account exists, or why it is refused.
    const review = user.reviewAccess;
    const state = review ? accessState(review, new Date()) : 'active';
    if (state !== 'active') {
      await this.auth.appendAuditLog({
        userId: user.id,
        action: AuditAction.REVIEW_ACCESS_REFUSED,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { state, at: 'login' },
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

    return this.issueTokens(user.id, context, review);
  }

  /**
   * Replaces the caller's password with one they chose, ends every session
   * of the account, and answers with a new one. This is the one thing a
   * review account can do while its handed-out password is still in place.
   */
  async changePassword(
    userId: string,
    body: ChangePasswordBody,
    context: RequestContext,
  ): Promise<AuthTokens> {
    const user = await this.auth.findUserById(userId);
    if (!user) throw new UnauthorizedException();

    const review = user.reviewAccess;
    if (review && accessState(review, new Date()) !== 'active') {
      throw new UnauthorizedException();
    }
    if (review?.sharedCredentials) {
      throw new ForbiddenException(
        "This sign-in is shared, so its password can't be changed",
      );
    }
    if (!(await verifyPassword(user.passwordHash, body.currentPassword))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (body.newPassword === body.currentPassword) {
      throw new BadRequestException(
        'Choose a password different from the current one',
      );
    }

    await this.auth.changePassword(
      userId,
      await hashPassword(body.newPassword),
      new Date(),
    );
    return this.issueTokens(
      userId,
      context,
      review ? { ...review, mustChangePassword: false } : null,
    );
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

    // A review account that was closed, or ran out, since it signed in.
    const review = await this.auth.findReviewAccess(userId);
    const state = review ? accessState(review, now) : 'active';
    if (state !== 'active') {
      await this.auth.closeSessions(userId, state, now);
      throw new UnauthorizedException();
    }

    const nowSec = Math.floor(now.getTime() / 1000);
    const accessToken = signJwt(
      userId,
      sessionId,
      env.JWT_SECRET,
      nowSec,
      claimsFor(review),
    );
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
    context: RequestContext,
    review: ReviewAccessRow = null,
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
    const accessToken = signJwt(
      userId,
      sessionId,
      env.JWT_SECRET,
      nowSec,
      claimsFor(review),
    );
    return { accessToken, refreshToken: rawToken };
  }
}
