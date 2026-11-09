import { INestApplication } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { signJwt } from '../auth/jwt';
import { env } from '../common/env';
import { AllExceptionsFilter } from '../common/filters/http-exception.filter';
import { PrismaService } from '../database/prisma.service';
import { OnDemandCandlesService } from '../market-data/on-demand-candles.service';
import { CandlesRepository } from '../symbols/candles.repository';
import { SymbolsRepository } from '../symbols/symbols.repository';
import { WatchlistsModule } from './watchlists.module';
import {
  WatchlistNotFoundError,
  WatchlistsRepository,
} from './watchlists.repository';

// Ownership is enforced by the repository's queries and covered against a
// real database in watchlists.repository.int-spec.ts; this checks the HTTP
// layer: the guard, validation, and how repository outcomes map to statuses.
describe('WatchlistsController', () => {
  let app: INestApplication;
  const watchlists = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    findItems: vi.fn(),
    create: vi.fn(),
    rename: vi.fn(),
    delete: vi.fn(),
    addItem: vi.fn(),
    removeItem: vi.fn(),
    reorderItems: vi.fn(),
  };
  const symbols = { findIdByTicker: vi.fn() };
  const candles = { findLatestCloses: vi.fn(), findRecentCloses: vi.fn() };
  const onDemand = { ensureCandles: vi.fn() };

  const USER = '019a0000-0000-7000-8000-000000000001';
  const LIST = '019a0000-0000-7000-8000-0000000000aa';
  const bearer = `Bearer ${signJwt(USER, 'sid', env.JWT_SECRET, Math.floor(Date.now() / 1000))}`;
  const row = {
    id: LIST,
    name: 'Core',
    createdAt: new Date('2026-10-30T10:00:00Z'),
    updatedAt: new Date('2026-10-30T10:00:00Z'),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [WatchlistsModule],
      providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(WatchlistsRepository)
      .useValue(watchlists)
      .overrideProvider(SymbolsRepository)
      .useValue(symbols)
      .overrideProvider(CandlesRepository)
      .useValue(candles)
      .overrideProvider(OnDemandCandlesService)
      .useValue(onDemand)
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
    candles.findLatestCloses.mockResolvedValue(new Map());
    candles.findRecentCloses.mockResolvedValue(new Map());
  });

  it('rejects requests without a bearer token', async () => {
    await request(app.getHttpServer()).get('/watchlists').expect(401);
    expect(watchlists.findAll).not.toHaveBeenCalled();
  });

  it('lists the signed-in user’s watchlists', async () => {
    watchlists.findAll.mockResolvedValueOnce([{ ...row, symbolCount: 2 }]);

    const res = await request(app.getHttpServer())
      .get('/watchlists')
      .set('Authorization', bearer)
      .expect(200);

    expect(watchlists.findAll).toHaveBeenCalledWith(USER);
    expect(res.body.watchlists).toEqual([
      {
        id: LIST,
        name: 'Core',
        symbolCount: 2,
        createdAt: '2026-10-30T10:00:00.000Z',
        updatedAt: '2026-10-30T10:00:00.000Z',
      },
    ]);
  });

  it('returns a list’s rows with their close and sparkline', async () => {
    watchlists.findOne.mockResolvedValueOnce(row);
    watchlists.findItems.mockResolvedValueOnce([
      {
        symbolId: 7,
        ticker: 'NVDA',
        name: 'NVIDIA',
        exchange: 'XNAS',
        position: 0,
        addedAt: new Date('2026-10-30T10:00:00Z'),
      },
    ]);
    const close = { date: '2024-06-10', close: '121.79', previousClose: '120.888' };
    const points = [{ date: '2024-06-07', close: '120.888' }, { date: '2024-06-10', close: '121.79' }];
    candles.findLatestCloses.mockResolvedValueOnce(new Map([[7, close]]));
    candles.findRecentCloses.mockResolvedValueOnce(new Map([[7, points]]));

    const res = await request(app.getHttpServer())
      .get(`/watchlists/${LIST}`)
      .set('Authorization', bearer)
      .expect(200);

    expect(watchlists.findOne).toHaveBeenCalledWith(USER, LIST);
    expect(candles.findRecentCloses).toHaveBeenCalledWith([7], 30);
    expect(res.body.items).toEqual([
      {
        ticker: 'NVDA',
        name: 'NVIDIA',
        exchange: 'XNAS',
        latestClose: close,
        sparkline: points,
        addedAt: '2026-10-30T10:00:00.000Z',
      },
    ]);
  });

  it('answers 404 for a list the user does not own', async () => {
    watchlists.findOne.mockResolvedValueOnce(null);
    await request(app.getHttpServer())
      .get(`/watchlists/${LIST}`)
      .set('Authorization', bearer)
      .expect(404);

    watchlists.delete.mockRejectedValueOnce(new WatchlistNotFoundError(LIST));
    await request(app.getHttpServer())
      .delete(`/watchlists/${LIST}`)
      .set('Authorization', bearer)
      .expect(404);
  });

  it('rejects a blank name and a non-uuid id before touching the database', async () => {
    await request(app.getHttpServer())
      .post('/watchlists')
      .set('Authorization', bearer)
      .send({ name: '   ' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/watchlists/not-a-uuid')
      .set('Authorization', bearer)
      .expect(400);
    expect(watchlists.create).not.toHaveBeenCalled();
    expect(watchlists.findOne).not.toHaveBeenCalled();
  });

  it('adds a symbol by case-insensitive ticker, 404 for an unknown one', async () => {
    symbols.findIdByTicker.mockResolvedValueOnce(7);
    watchlists.addItem.mockResolvedValueOnce(undefined);
    watchlists.findOne.mockResolvedValueOnce(row);
    watchlists.findItems.mockResolvedValueOnce([]);

    await request(app.getHttpServer())
      .post(`/watchlists/${LIST}/items`)
      .set('Authorization', bearer)
      .send({ ticker: 'nvda' })
      .expect(201);
    expect(symbols.findIdByTicker).toHaveBeenCalledWith('NVDA');
    expect(watchlists.addItem).toHaveBeenCalledWith(USER, LIST, 7);

    symbols.findIdByTicker.mockResolvedValueOnce(null);
    await request(app.getHttpServer())
      .post(`/watchlists/${LIST}/items`)
      .set('Authorization', bearer)
      .send({ ticker: 'NOPE' })
      .expect(404);
  });

  it('answers 400 when the new order is not a permutation of the list', async () => {
    symbols.findIdByTicker.mockResolvedValueOnce(7).mockResolvedValueOnce(9);
    watchlists.reorderItems.mockResolvedValueOnce(false);

    await request(app.getHttpServer())
      .put(`/watchlists/${LIST}/items/order`)
      .set('Authorization', bearer)
      .send({ tickers: ['NVDA', 'AAPL'] })
      .expect(400);
    expect(watchlists.reorderItems).toHaveBeenCalledWith(USER, LIST, [7, 9]);
  });
});
