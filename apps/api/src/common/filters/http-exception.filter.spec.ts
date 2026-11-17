import { Controller, Get, INestApplication, Query } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { createZodDto, ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { z } from 'zod';
import { ConflictError, NotFoundError } from '../domain-errors';
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

  @Get('gone')
  gone() {
    throw new NotFoundError('List 7 not found');
  }

  @Get('taken')
  taken() {
    throw new ConflictError('A list named "Core" already exists');
  }

  @Get('broken')
  broken() {
    throw new Error('connection string postgres://secret');
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

  it('gives a domain error its status and its own message', async () => {
    const gone = await request(app.getHttpServer()).get('/range/gone').expect(404);
    expect(gone.body.detail).toBe('List 7 not found');
    const taken = await request(app.getHttpServer()).get('/range/taken').expect(409);
    expect(taken.body.detail).toBe('A list named "Core" already exists');
  });

  it('hides the message of anything else behind a 500', async () => {
    const res = await request(app.getHttpServer()).get('/range/broken').expect(500);
    expect(res.body.detail).toBe('Internal server error');
  });

  it('leaves errors out of other problems', async () => {
    const res = await request(app.getHttpServer()).get('/missing').expect(404);

    expect(res.body.status).toBe(404);
    expect(res.body).not.toHaveProperty('errors');
  });
});
