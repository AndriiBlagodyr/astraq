import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LoggerModule } from 'nestjs-pino';
import request from 'supertest';
import { assignRequestId } from './request-id';

@Controller('ping')
class PingController {
  @Get()
  ping() {
    return 'pong';
  }
}

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: { level: 'silent', genReqId: assignRequestId },
    }),
  ],
  controllers: [PingController],
})
class TestModule {}

describe('assignRequestId', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('echoes a caller-supplied id', async () => {
    const res = await request(app.getHttpServer())
      .get('/ping')
      .set('x-request-id', 'client-abc.123')
      .expect(200);

    expect(res.headers['x-request-id']).toBe('client-abc.123');
  });

  it('replaces an unsafe id with a generated one', async () => {
    const res = await request(app.getHttpServer())
      .get('/ping')
      .set('x-request-id', 'a'.repeat(129))
      .expect(200);

    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('generates an id when none is sent', async () => {
    const res = await request(app.getHttpServer()).get('/ping').expect(200);

    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
