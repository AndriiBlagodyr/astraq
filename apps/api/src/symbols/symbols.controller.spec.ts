import { INestApplication } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { CacheStore, NoCacheStore } from '../common/cache-store';
import { AllExceptionsFilter } from '../common/filters/http-exception.filter';
import { PrismaService } from '../database/prisma.service';
import { CandlesRepository } from './candles.repository';
import { SymbolsModule } from './symbols.module';
import { SymbolsRepository } from './symbols.repository';

// The SQL itself is covered by candles.repository.int-spec.ts against a real
// database; this checks the HTTP layer around it.
describe('SymbolsController', () => {
  let app: INestApplication;
  const symbols = { search: vi.fn(), findIdByTicker: vi.fn() };
  const candles = {
    findDaily: vi.fn(),
    findWeekly: vi.fn(),
    findLatestCloses: vi.fn(),
    findSplits: vi.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [SymbolsModule],
      providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      // The cache has its own spec; here every read reaches the repositories.
      .overrideProvider(CacheStore)
      .useValue(new NoCacheStore())
      .overrideProvider(SymbolsRepository)
      .useValue(symbols)
      .overrideProvider(CandlesRepository)
      .useValue(candles)
      .compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("adds each symbol's latest close to search results, null without bars", async () => {
    symbols.search.mockResolvedValueOnce([
      { id: 7, ticker: 'NVDA', name: 'NVIDIA', exchange: 'XNAS' },
      { id: 9, ticker: 'NEW', name: 'Newly listed', exchange: 'XNYS' },
    ]);
    const close = { date: '2024-06-10', close: '121.79', previousClose: '120.888' };
    candles.findLatestCloses.mockResolvedValueOnce(new Map([[7, close]]));

    const res = await request(app.getHttpServer())
      .get('/symbols?query=n')
      .expect(200);

    expect(candles.findLatestCloses).toHaveBeenCalledWith([7, 9]);
    expect(res.body.symbols).toEqual([
      { ticker: 'NVDA', name: 'NVIDIA', exchange: 'XNAS', latestClose: close },
      { ticker: 'NEW', name: 'Newly listed', exchange: 'XNYS', latestClose: null },
    ]);
  });

  it('serves candles for a ticker in any case, split-adjusted by default', async () => {
    symbols.findIdByTicker.mockResolvedValueOnce(7);
    candles.findDaily.mockResolvedValueOnce([]);
    candles.findSplits.mockResolvedValueOnce([
      { exDate: '2024-06-10', from: '1', to: '10' },
    ]);

    const res = await request(app.getHttpServer())
      .get('/symbols/nvda/candles?from=2024-01-01')
      .expect(200);

    expect(symbols.findIdByTicker).toHaveBeenCalledWith('NVDA');
    expect(candles.findDaily).toHaveBeenCalledWith(
      7,
      { from: '2024-01-01', to: null },
      'split',
    );
    expect(candles.findSplits).toHaveBeenCalledWith(7, {
      from: '2024-01-01',
      to: null,
    });
    expect(res.body).toEqual({
      ticker: 'NVDA',
      adjustment: 'split',
      interval: '1d',
      candles: [],
      splits: [{ exDate: '2024-06-10', from: '1', to: '10' }],
    });
  });

  it('serves weekly bars from the weekly read when asked for them', async () => {
    symbols.findIdByTicker.mockResolvedValueOnce(7);
    candles.findDaily.mockClear();
    const week = {
      time: '2024-06-03',
      open: '113.62',
      high: '125.59',
      low: '112',
      close: '120.888',
      volume: '2180000000',
    };
    candles.findWeekly.mockResolvedValueOnce([week]);
    candles.findSplits.mockResolvedValueOnce([]);

    const res = await request(app.getHttpServer())
      .get('/symbols/NVDA/candles?interval=1w&adjustment=all')
      .expect(200);

    expect(candles.findWeekly).toHaveBeenCalledWith(
      7,
      { from: null, to: null },
      'all',
    );
    expect(candles.findDaily).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({ interval: '1w', candles: [week] });
  });

  it('rejects an interval it has no bars for', async () => {
    await request(app.getHttpServer())
      .get('/symbols/NVDA/candles?interval=1m')
      .expect(400);
  });

  it('returns 404 for an unknown ticker', async () => {
    symbols.findIdByTicker.mockResolvedValueOnce(null);

    await request(app.getHttpServer()).get('/symbols/NOPE/candles').expect(404);
  });

  it('rejects a path that is not a ticker before touching the database', async () => {
    symbols.findIdByTicker.mockClear();

    await request(app.getHttpServer())
      .get(`/symbols/${'X'.repeat(40)}/candles`)
      .expect(400);
    expect(symbols.findIdByTicker).not.toHaveBeenCalled();
  });

  it('rejects a range that ends before it starts', async () => {
    const res = await request(app.getHttpServer())
      .get('/symbols/NVDA/candles?from=2024-02-01&to=2024-01-01')
      .expect(400);

    expect(res.body.errors).toEqual([
      expect.objectContaining({ path: ['from'] }),
    ]);
  });
});
