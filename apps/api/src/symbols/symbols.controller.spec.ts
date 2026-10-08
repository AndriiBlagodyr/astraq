import { INestApplication } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
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
      candles: [],
      splits: [{ exDate: '2024-06-10', from: '1', to: '10' }],
    });
  });

  it('returns 404 for an unknown ticker', async () => {
    symbols.findIdByTicker.mockResolvedValueOnce(null);

    await request(app.getHttpServer()).get('/symbols/NOPE/candles').expect(404);
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
