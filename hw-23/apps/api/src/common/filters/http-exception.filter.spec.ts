import { Controller, Get, INestApplication, Query } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { createZodDto, ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { z } from 'zod';
import { AllExceptionsFilter } from './http-exception.filter';

class RangeQueryDto extends createZodDto(
  z.object({ from: z.iso.date() }),
) {}

@Controller('range')
class RangeController {
  @Get()
  range(@Query() query: RangeQueryDto) {
    return query;
  }
}

describe('AllExceptionsFilter', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RangeController],
      providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('turns a validation failure into a 400 problem with its issues', async () => {
    const res = await request(app.getHttpServer())
      .get('/range?from=yesterday')
      .expect(400);

    expect(res.body).toMatchObject({
      status: 400,
      title: 'BAD_REQUEST',
      instance: '/range?from=yesterday',
      errors: [{ path: ['from'], message: expect.any(String) }],
    });
  });

  it('leaves errors out of other problems', async () => {
    const res = await request(app.getHttpServer()).get('/missing').expect(404);

    expect(res.body.status).toBe(404);
    expect(res.body).not.toHaveProperty('errors');
  });
});
