import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PredictionsModule } from './predictions.module';

describe('PredictionsController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PredictionsModule],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/predictions/summary returns placeholder', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/predictions/summary')
      .expect(200);

    expect(res.body).toEqual({
      trend: 'neutral',
      confidence: 0.0,
      message: 'Prediction summary endpoint placeholder',
    });
  });
});
