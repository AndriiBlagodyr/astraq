import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../database/prisma.service';
import { HealthModule } from './health.module';

describe('HealthController', () => {
  let app: INestApplication;
  const prisma = { isReachable: vi.fn<() => Promise<boolean>>() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live returns ok', async () => {
    const res = await request(app.getHttpServer())
      .get('/health/live')
      .expect(200);

    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /health/ready returns ok when the database answers', async () => {
    prisma.isReachable.mockResolvedValueOnce(true);

    const res = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);

    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /health/ready returns 503 when the database is down', async () => {
    prisma.isReachable.mockResolvedValueOnce(false);

    await request(app.getHttpServer()).get('/health/ready').expect(503);
  });
});
