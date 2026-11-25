import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { QueueStatus } from '@astraq/shared';
import request from 'supertest';
import { signJwt } from '../auth/jwt';
import { env } from '../common/env';
import { PrismaService } from '../database/prisma.service';
import { AdminModule } from './admin.module';
import { QueueAdminService } from './queue-admin.service';

// Who gets in. What the queue reports is covered against real Redis in
// market-data/jobs/market-data.worker.int-spec.ts.
describe('QueueAdminController', () => {
  let app: INestApplication;
  const findUnique = vi.fn();
  const queue = { status: vi.fn(), retryDead: vi.fn() };
  const admins = env.ADMIN_EMAILS;

  const bearer = (user: string) =>
    `Bearer ${signJwt(user, 'sid', env.JWT_SECRET, Math.floor(Date.now() / 1000))}`;

  const status: QueueStatus = {
    queue: 'market-data',
    asOf: '2026-11-25T21:30:00.000Z',
    counts: {
      waiting: 0,
      active: 0,
      delayed: 1,
      waitingChildren: 0,
      completed: 12,
      failed: 0,
      dead: 0,
    },
    active: [],
    delayed: [
      {
        id: 'session-close-2026-11-27',
        name: 'session-close',
        data: { session: '2026-11-27' },
        attempts: 0,
        maxAttempts: 8,
        error: null,
        at: '2026-11-27T18:30:00.000Z',
      },
    ],
    failed: [],
    dead: [],
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AdminModule] })
      .overrideProvider(PrismaService)
      .useValue({ user: { findUnique } })
      .overrideProvider(QueueAdminService)
      .useValue(queue)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    env.ADMIN_EMAILS = ['ops@example.com'];
    findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
      where.id === 'admin' ? { email: 'ops@example.com' } : { email: 'me@example.com' },
    );
    queue.status.mockResolvedValue(status);
    queue.retryDead.mockResolvedValue({ retried: 2 });
  });

  afterAll(async () => {
    env.ADMIN_EMAILS = admins;
    await app.close();
  });

  it('serves the queue to a user named in ADMIN_EMAILS', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/queue')
      .set('Authorization', bearer('admin'))
      .expect(200);
    expect(res.body).toEqual(status);
  });

  it('refuses everyone else: 401 without a session, 403 with one', async () => {
    await request(app.getHttpServer()).get('/admin/queue').expect(401);
    await request(app.getHttpServer())
      .get('/admin/queue')
      .set('Authorization', bearer('someone'))
      .expect(403);
    await request(app.getHttpServer())
      .post('/admin/queue/dead/retry')
      .set('Authorization', bearer('someone'))
      .expect(403);
    expect(queue.status).not.toHaveBeenCalled();
    expect(queue.retryDead).not.toHaveBeenCalled();
  });

  it('has no admins when the list is empty', async () => {
    env.ADMIN_EMAILS = [];
    await request(app.getHttpServer())
      .get('/admin/queue')
      .set('Authorization', bearer('admin'))
      .expect(403);
  });

  it('puts the dead letters back for an admin', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/queue/dead/retry')
      .set('Authorization', bearer('admin'))
      .expect(200);
    expect(res.body).toEqual({ retried: 2 });
  });
});
