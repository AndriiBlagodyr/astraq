import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { HealthModule } from './health.module';

describe('HealthController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

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

  it('GET /health/ready returns ok', async () => {
    const res = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);

    expect(res.body).toEqual({ status: 'ok' });
  });
});
