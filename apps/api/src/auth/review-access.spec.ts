import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { env } from '../common/env';
import { signJwt, verifyJwt } from './jwt';
import { AllowBeforePasswordChange, JwtAuthGuard } from './jwt-auth.guard';
import { accessState } from './review-access';

describe('accessState', () => {
  const now = new Date('2026-11-27T12:00:00Z');
  const later = new Date('2026-12-11T12:00:00Z');
  const earlier = new Date('2026-11-20T12:00:00Z');

  it('is active before the end date', () => {
    expect(accessState({ expiresAt: later, revokedAt: null }, now)).toBe('active');
  });

  it('is expired at the end date, not after it', () => {
    expect(accessState({ expiresAt: now, revokedAt: null }, now)).toBe('expired');
    expect(accessState({ expiresAt: earlier, revokedAt: null }, now)).toBe('expired');
  });

  it('is revoked whatever the end date says', () => {
    expect(accessState({ expiresAt: later, revokedAt: earlier }, now)).toBe('revoked');
    expect(accessState({ expiresAt: earlier, revokedAt: earlier }, now)).toBe('revoked');
  });
});

describe('a review account’s access token', () => {
  const nowSec = 1_800_000_000;
  const payload = (token: string) => {
    const result = verifyJwt(token, env.JWT_SECRET, nowSec);
    if (!result.ok) throw new Error(result.reason);
    return result.payload;
  };

  it('carries no extra claim for an ordinary account', () => {
    const token = signJwt('user', 'sid', env.JWT_SECRET, nowSec);
    expect(payload(token)).toEqual({
      sub: 'user',
      sid: 'sid',
      iat: nowSec,
      exp: nowSec + 600,
    });
  });

  it('says when the password must be replaced', () => {
    const token = signJwt('user', 'sid', env.JWT_SECRET, nowSec, {
      mustChangePassword: true,
    });
    expect(payload(token).pwd).toBe(true);
  });

  it('never outlives the end date', () => {
    const soon = signJwt('user', 'sid', env.JWT_SECRET, nowSec, {
      notAfter: new Date((nowSec + 120) * 1000),
    });
    expect(payload(soon).exp).toBe(nowSec + 120);

    const far = signJwt('user', 'sid', env.JWT_SECRET, nowSec, {
      notAfter: new Date((nowSec + 86_400) * 1000),
    });
    expect(payload(far).exp).toBe(nowSec + 600);
  });
});

describe('JwtAuthGuard and a password that must be replaced', () => {
  const nowSec = Math.floor(Date.now() / 1000);
  const guard = new JwtAuthGuard(new Reflector());

  class Routes {
    @AllowBeforePasswordChange()
    changePassword() {}
    anythingElse() {}
  }

  const request = (handler: () => void, token: string) =>
    ({
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: `Bearer ${token}` } }),
      }),
    }) as unknown as ExecutionContext;

  const pending = signJwt('user', 'sid', env.JWT_SECRET, nowSec, {
    mustChangePassword: true,
  });
  const settled = signJwt('user', 'sid', env.JWT_SECRET, nowSec);

  it('lets a pending token reach only the routes that allow it', () => {
    const routes = new Routes();
    expect(guard.canActivate(request(routes.changePassword, pending))).toBe(true);
    expect(() => guard.canActivate(request(routes.anythingElse, pending))).toThrow(
      ForbiddenException,
    );
  });

  it('lets an ordinary token reach both', () => {
    const routes = new Routes();
    expect(guard.canActivate(request(routes.changePassword, settled))).toBe(true);
    expect(guard.canActivate(request(routes.anythingElse, settled))).toBe(true);
  });
});
