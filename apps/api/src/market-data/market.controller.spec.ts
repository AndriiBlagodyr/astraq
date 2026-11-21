import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../database/prisma.service';
import { MarketDataModule } from './market-data.module';
import { MarketDataRepository } from './market-data.repository';

// The clock itself is covered in trading/settlement.spec.ts ("market
// hours"); this checks the endpoint reads the stored calendar through it.
describe('MarketController', () => {
  let app: INestApplication;
  const repository = { findMarketSessions: vi.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [MarketDataModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(MarketDataRepository)
      .useValue(repository)
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    vi.useRealTimers();
    await app.close();
  });

  // Thanksgiving 2026, 11:00 New York: a weekday the exchange is closed on.
  const thanksgiving = new Date('2026-11-26T16:00:00.000Z');
  const friday = {
    date: '2026-11-27',
    open: new Date('2026-11-27T14:30:00.000Z'),
    close: new Date('2026-11-27T18:00:00.000Z'),
  };

  it('is closed on a holiday the stored calendar knows, with the half day next', async () => {
    vi.useFakeTimers({ now: thanksgiving, toFake: ['Date'] });
    repository.findMarketSessions.mockResolvedValue({
      first: '2016-01-04',
      last: '2027-12-31',
      sessions: [friday],
    });

    const res = await request(app.getHttpServer())
      .get('/market/status')
      .expect(200);

    expect(res.body).toEqual({
      asOf: '2026-11-26T16:00:00.000Z',
      open: false,
      session: null,
      nextSession: {
        date: '2026-11-27',
        opensAt: '2026-11-27T14:30:00.000Z',
        closesAt: '2026-11-27T18:00:00.000Z',
      },
      calendar: 'exchange',
    });
  });

  it('falls back to weekdays without a stored calendar, and says so', async () => {
    vi.useFakeTimers({ now: thanksgiving, toFake: ['Date'] });
    repository.findMarketSessions.mockResolvedValue({
      first: null,
      last: null,
      sessions: [],
    });

    const res = await request(app.getHttpServer())
      .get('/market/status')
      .expect(200);

    expect(res.body).toMatchObject({
      open: true,
      session: { date: '2026-11-26', closesAt: '2026-11-26T21:00:00.000Z' },
      nextSession: { date: '2026-11-27', closesAt: '2026-11-27T21:00:00.000Z' },
      calendar: 'weekdays',
    });
  });
});
