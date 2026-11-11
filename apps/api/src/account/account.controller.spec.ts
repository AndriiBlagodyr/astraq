import { INestApplication } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { signJwt } from '../auth/jwt';
import { env } from '../common/env';
import { AllExceptionsFilter } from '../common/filters/http-exception.filter';
import { PrismaService } from '../database/prisma.service';
import { AccountModule } from './account.module';
import { AccountRepository, SessionNotFoundError } from './account.repository';

// Ownership lives in the repository's WHERE clauses (scoped by user id like
// the watchlists repository); this checks the HTTP layer: the guard,
// validation, which session is "current", and how outcomes map to statuses.
describe('AccountController', () => {
  let app: INestApplication;
  const account = {
    findUser: vi.fn(),
    updateName: vi.fn(),
    findLiveSessions: vi.fn(),
    revokeSession: vi.fn(),
  };

  const USER = '019a0000-0000-7000-8000-000000000001';
  const SESSION = '019a0000-0000-7000-8000-0000000000aa';
  const OTHER_SESSION = '019a0000-0000-7000-8000-0000000000bb';
  const bearer = `Bearer ${signJwt(USER, SESSION, env.JWT_SECRET, Math.floor(Date.now() / 1000))}`;
  const user = {
    id: USER,
    email: 'me@veracand.test',
    name: null,
    createdAt: new Date('2026-10-21T10:00:00Z'),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AccountModule],
      providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(AccountRepository)
      .useValue(account)
      .compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects requests without a bearer token', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
    expect(account.findUser).not.toHaveBeenCalled();
  });

  it('returns the signed-in user’s profile', async () => {
    account.findUser.mockResolvedValueOnce(user);

    const res = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', bearer)
      .expect(200);

    expect(account.findUser).toHaveBeenCalledWith(USER);
    expect(res.body).toEqual({
      id: USER,
      email: 'me@veracand.test',
      name: null,
      createdAt: '2026-10-21T10:00:00.000Z',
    });
  });

  it('trims the name, clears it when blank, and rejects a long one', async () => {
    account.updateName.mockResolvedValue({ ...user, name: 'Andrii' });

    await request(app.getHttpServer())
      .patch('/me')
      .set('Authorization', bearer)
      .send({ name: '  Andrii ' })
      .expect(200);
    expect(account.updateName).toHaveBeenCalledWith(USER, 'Andrii');

    await request(app.getHttpServer())
      .patch('/me')
      .set('Authorization', bearer)
      .send({ name: '   ' })
      .expect(200);
    expect(account.updateName).toHaveBeenLastCalledWith(USER, null);

    await request(app.getHttpServer())
      .patch('/me')
      .set('Authorization', bearer)
      .send({ name: 'x'.repeat(81) })
      .expect(400);
    expect(account.updateName).toHaveBeenCalledTimes(2);
  });

  it('lists live sessions and marks the one the token belongs to', async () => {
    const createdAt = new Date('2026-11-01T08:00:00Z');
    account.findLiveSessions.mockResolvedValueOnce([
      {
        id: OTHER_SESSION,
        userAgent: 'Mozilla/5.0 (iPhone)',
        ip: '203.0.113.9',
        createdAt,
        lastUsedAt: new Date('2026-11-09T08:00:00Z'),
        expiresAt: new Date('2026-12-01T08:00:00Z'),
      },
      {
        id: SESSION,
        userAgent: null,
        ip: null,
        createdAt,
        lastUsedAt: createdAt,
        expiresAt: new Date('2026-12-01T08:00:00Z'),
      },
    ]);

    const res = await request(app.getHttpServer())
      .get('/me/sessions')
      .set('Authorization', bearer)
      .expect(200);

    expect(account.findLiveSessions).toHaveBeenCalledWith(USER, expect.any(Date));
    expect(res.body.sessions.map((s: { id: string; current: boolean }) => [s.id, s.current])).toEqual([
      [OTHER_SESSION, false],
      [SESSION, true],
    ]);
    expect(res.body.sessions[0]).toMatchObject({
      userAgent: 'Mozilla/5.0 (iPhone)',
      ip: '203.0.113.9',
      createdAt: '2026-11-01T08:00:00.000Z',
      lastUsedAt: '2026-11-09T08:00:00.000Z',
    });
  });

  it('revokes one of the user’s sessions, 404 for a foreign one, 400 for a bad id', async () => {
    account.revokeSession.mockResolvedValueOnce(undefined);
    await request(app.getHttpServer())
      .delete(`/me/sessions/${OTHER_SESSION}`)
      .set('Authorization', bearer)
      .expect(204);
    expect(account.revokeSession).toHaveBeenCalledWith(USER, OTHER_SESSION);

    account.revokeSession.mockRejectedValueOnce(new SessionNotFoundError(OTHER_SESSION));
    await request(app.getHttpServer())
      .delete(`/me/sessions/${OTHER_SESSION}`)
      .set('Authorization', bearer)
      .expect(404);

    await request(app.getHttpServer())
      .delete('/me/sessions/not-a-uuid')
      .set('Authorization', bearer)
      .expect(400);
    expect(account.revokeSession).toHaveBeenCalledTimes(2);
  });
});
