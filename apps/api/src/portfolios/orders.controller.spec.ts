import {
  ConflictException,
  INestApplication,
  UnprocessableEntityException,
} from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { signJwt } from '../auth/jwt';
import { env } from '../common/env';
import { AllExceptionsFilter } from '../common/filters/http-exception.filter';
import { PrismaService } from '../database/prisma.service';
import { OrdersService } from './orders.service';
import { PortfoliosModule } from './portfolios.module';
import { PortfoliosService } from './portfolios.service';

// The rules are covered as pure functions (trading/settlement.spec.ts) and
// against a real database (orders.int-spec.ts). This checks the HTTP layer:
// the guard, validation, and the Idempotency-Key header.
describe('Portfolio and order endpoints', () => {
  let app: INestApplication;
  const orders = { list: vi.fn(), place: vi.fn(), preview: vi.fn(), cancel: vi.fn() };
  const portfolios = {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    transfer: vi.fn(),
  };

  const USER = '019a0000-0000-7000-8000-000000000001';
  const PORTFOLIO = '019a0000-0000-7000-8000-0000000000aa';
  const ORDER = '019a0000-0000-7000-8000-0000000000bb';
  const bearer = `Bearer ${signJwt(USER, 'sid', env.JWT_SECRET, Math.floor(Date.now() / 1000))}`;
  const order = {
    id: ORDER,
    ticker: 'NVDA',
    side: 'buy',
    type: 'limit',
    quantity: '10',
    limitPrice: '120.5',
    status: 'open',
    closeReason: null,
    placedAt: '2026-06-02T15:00:00.000Z',
    closedAt: null,
    fill: null,
  };
  const body = { ticker: 'NVDA', side: 'buy', type: 'limit', quantity: '10', limitPrice: '120.5' };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PortfoliosModule],
      providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(OrdersService)
      .useValue(orders)
      .overrideProvider(PortfoliosService)
      .useValue(portfolios)
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

  const post = (path: string) =>
    request(app.getHttpServer()).post(path).set('Authorization', bearer);

  it('rejects requests without a bearer token', async () => {
    await request(app.getHttpServer()).get('/portfolios').expect(401);
    await request(app.getHttpServer())
      .post(`/portfolios/${PORTFOLIO}/orders`)
      .set('Idempotency-Key', 'k')
      .send(body)
      .expect(401);
    expect(orders.place).not.toHaveBeenCalled();
  });

  it('places an order under its idempotency key and marks a replay', async () => {
    orders.place.mockResolvedValueOnce({ order, replayed: false });
    const first = await post(`/portfolios/${PORTFOLIO}/orders`)
      .set('Idempotency-Key', 'ticket-1')
      .send(body)
      .expect(201);
    expect(first.body).toEqual(order);
    expect(first.headers['idempotency-replayed']).toBeUndefined();
    expect(orders.place).toHaveBeenCalledWith(USER, PORTFOLIO, 'ticket-1', body);

    orders.place.mockResolvedValueOnce({ order, replayed: true });
    const second = await post(`/portfolios/${PORTFOLIO}/orders`)
      .set('Idempotency-Key', 'ticket-1')
      .send(body)
      .expect(201);
    expect(second.headers['idempotency-replayed']).toBe('true');
  });

  it('refuses an order without a key or with terms that do not fit its type', async () => {
    await post(`/portfolios/${PORTFOLIO}/orders`).send(body).expect(400);
    const keyed = () =>
      post(`/portfolios/${PORTFOLIO}/orders`).set('Idempotency-Key', 'k');
    await keyed().send({ ...body, limitPrice: undefined }).expect(400);
    await keyed().send({ ...body, type: 'market' }).expect(400);
    await keyed().send({ ...body, quantity: '0' }).expect(400);
    await keyed().send({ ...body, quantity: '1.0000001' }).expect(400);
    expect(orders.place).not.toHaveBeenCalled();
  });

  it('previews an order without a key, and passes a refused placement back as a 422', async () => {
    const preview = {
      timing: 'next_session',
      fillSession: '2026-06-03',
      estimatedPrice: '120.500000',
      priceDate: null,
      notional: '1205.00',
      commission: '0.00',
      cashAfter: '-205.00',
      refusal: { code: 'insufficient_cash', message: 'The order needs about 1205.00' },
    };
    orders.preview.mockResolvedValueOnce(preview);
    const res = await post(`/portfolios/${PORTFOLIO}/orders/preview`).send(body).expect(200);
    expect(res.body).toEqual(preview);
    expect(orders.preview).toHaveBeenCalledWith(USER, PORTFOLIO, body);
    await post(`/portfolios/${PORTFOLIO}/orders/preview`).send({ ...body, quantity: '0' }).expect(400);

    orders.place.mockRejectedValueOnce(new UnprocessableEntityException(preview.refusal.message));
    const refused = await post(`/portfolios/${PORTFOLIO}/orders`)
      .set('Idempotency-Key', 'k')
      .send(body)
      .expect(422);
    expect(refused.body.detail).toBe(preview.refusal.message);
  });

  it('passes a cancel through, and a conflict back', async () => {
    orders.cancel.mockResolvedValueOnce({ ...order, status: 'cancelled', closeReason: 'user', closedAt: order.placedAt });
    const res = await post(`/portfolios/${PORTFOLIO}/orders/${ORDER}/cancel`).expect(200);
    expect(res.body.status).toBe('cancelled');
    expect(orders.cancel).toHaveBeenCalledWith(USER, PORTFOLIO, ORDER);

    orders.cancel.mockRejectedValueOnce(new ConflictException('The order is already filled'));
    await post(`/portfolios/${PORTFOLIO}/orders/${ORDER}/cancel`).expect(409);
  });

  it('validates a new portfolio and fills in its default costs', async () => {
    await post('/portfolios').send({ name: ' ', startingCash: '1000' }).expect(400);
    await post('/portfolios').send({ name: 'Paper', startingCash: '10.001' }).expect(400);
    await post('/portfolios').send({ name: 'Paper', startingCash: '1000', slippageBps: 1001 }).expect(400);
    await post('/portfolios').send({ name: 'Paper', startingCash: '1000', maxOrderNotional: '0' }).expect(400);
    expect(portfolios.create).not.toHaveBeenCalled();

    portfolios.create.mockResolvedValueOnce({
      id: PORTFOLIO,
      name: 'Paper',
      slippageBps: 0,
      commissionPerOrder: '0',
      commissionPerShare: '0',
      maxOrderNotional: null,
      createdAt: '2026-06-01T10:00:00.000Z',
      updatedAt: '2026-06-01T10:00:00.000Z',
      cash: '1000.00',
      capital: '1000.00',
      fees: '0.00',
      realizedPnl: '0.00',
      dividendIncome: '0.00',
      dividendsReceivable: '0.00',
      marketValue: '0.00',
      unrealizedPnl: '0.00',
      equity: '1000.00',
      positions: [],
    });
    await post('/portfolios').send({ name: ' Paper ', startingCash: '1000' }).expect(201);
    expect(portfolios.create).toHaveBeenCalledWith(USER, {
      name: 'Paper',
      startingCash: '1000',
      slippageBps: 0,
      commissionPerOrder: '0',
      commissionPerShare: '0',
    });
  });
});
