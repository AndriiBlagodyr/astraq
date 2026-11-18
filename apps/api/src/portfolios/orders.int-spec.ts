import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { format } from '../common/decimal';
import { utcMidnight } from '../common/dates';
import { PrismaService } from '../database/prisma.service';
import { positions } from '../ledger/ledger';
import {
  LedgerRepository,
  PortfolioNotFoundError,
} from '../ledger/ledger.repository';
import type { MarketCalendarService } from '../market-data/market-calendar.service';
import type { OnDemandCandlesService } from '../market-data/on-demand-candles.service';
import { SymbolsRepository } from '../symbols/symbols.repository';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { PortfoliosRepository } from './portfolios.repository';
import { PortfoliosService } from './portfolios.service';

// Runs against a real database (`pnpm --filter @astraq/api test:integration`).
// Verifies what only the database can (ROADMAP Phase 3 exit criteria): one
// idempotency key places one order however many requests race, and an
// order, its fill, and its ledger transaction are written together.
describe('Orders (database)', () => {
  const prisma = new PrismaService();
  const ledgerRepository = new LedgerRepository();
  const orders = new OrdersService(
    new OrdersRepository(prisma, ledgerRepository),
    new SymbolsRepository(prisma),
    { ensureCandles: async () => {} } as unknown as OnDemandCandlesService,
    // No calendar: the weekday rule, whatever `market_sessions` holds.
    { around: async () => null } as unknown as MarketCalendarService,
  );
  const portfolios = new PortfoliosService(
    new PortfoliosRepository(prisma, ledgerRepository),
    orders,
  );

  const EMAIL = 'itest-orders@veracand.test';
  const OTHER_EMAIL = 'itest-orders-other@veracand.test';
  const TICKER = 'ITORD';
  const PASSWORD_HASH = '$argon2id$v=19$m=19456,t=2,p=1$dGVzdA$dGVzdGhhc2g';
  // The first week of June 2026, New York on summer time: the session runs
  // from 13:30 to 20:00 UTC.
  const MON = '2026-06-01';
  const TUE = '2026-06-02';
  const WED = '2026-06-03';
  const THU = '2026-06-04';
  const at = (date: string, utcTime: string) =>
    new Date(`${date}T${utcTime}:00Z`);

  let userId: string;
  let otherUserId: string;
  let symbolId: number;

  // Users first: their portfolios take the orders that pin the symbol.
  async function cleanup() {
    await prisma.user.deleteMany({
      where: { email: { in: [EMAIL, OTHER_EMAIL] } },
    });
    await prisma.symbol.deleteMany({ where: { ticker: TICKER } });
  }

  const bar = (date: string, price: string) => ({
    symbolId,
    ts: utcMidnight(date),
    open: price,
    high: price,
    low: price,
    close: price,
    volume: 1000n,
  });

  const buyTen = { ticker: TICKER, side: 'buy', type: 'market', quantity: '10' } as const;

  beforeAll(async () => {
    await cleanup();
    const [user, other] = await Promise.all(
      [EMAIL, OTHER_EMAIL].map((email) =>
        prisma.user.create({ data: { email, passwordHash: PASSWORD_HASH } }),
      ),
    );
    userId = user!.id;
    otherUserId = other!.id;
    const symbol = await prisma.symbol.create({
      data: { ticker: TICKER, name: 'Orders test', exchange: 'XTST' },
    });
    symbolId = symbol.id;
    await prisma.candleDaily.create({ data: bar(MON, '100') });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('places exactly one order for concurrent requests with one idempotency key', async () => {
    const portfolio = await portfolios.create(userId, {
      name: 'Idempotent',
      startingCash: '10000',
      slippageBps: 0,
      commissionPerOrder: '1',
      commissionPerShare: '0',
    });

    // Ten copies of one request, mid-session on Tuesday. Without the
    // portfolio lock each would see "no order for this key yet" and fill.
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        orders.place(userId, portfolio.id, 'key-1', buyTen, at(TUE, '15:00')),
      ),
    );

    expect(new Set(results.map((result) => result.order.id)).size).toBe(1);
    expect(results.filter((result) => !result.replayed)).toHaveLength(1);
    expect(results[0]!.order).toMatchObject({
      ticker: TICKER,
      status: 'filled',
      fill: { rule: 'market_last', price: '100', notional: '1000.00', commission: '1.00', sessionDate: MON },
    });

    // One order, one fill, one ledger transaction after the opening deposit.
    const stored = await prisma.order.findMany({
      where: { portfolioId: portfolio.id },
      include: { fill: { include: { ledgerTransaction: true } } },
    });
    expect(stored).toHaveLength(1);
    expect(stored[0]!.fill!.ledgerTransaction).toMatchObject({ seq: 2, kind: 'BUY' });
    const state = await orders.settle(userId, portfolio.id, at(TUE, '15:01'));
    expect(format(state.cash)).toBe('8999.00');

    // The key now means that order: a different one under it is refused.
    await expect(
      orders.place(userId, portfolio.id, 'key-1', { ...buyTen, quantity: '11' }, at(TUE, '15:02')),
    ).rejects.toBeInstanceOf(ConflictException);
    // Another user can't reach the portfolio at all.
    await expect(
      orders.place(otherUserId, portfolio.id, 'key-2', buyTen, at(TUE, '15:03')),
    ).rejects.toBeInstanceOf(PortfolioNotFoundError);
    expect(await prisma.order.count({ where: { portfolioId: portfolio.id } })).toBe(1);
  });

  it('refuses an order the portfolio cannot cover, and stores nothing for it', async () => {
    const portfolio = await portfolios.create(userId, {
      name: 'Guarded',
      startingCash: '1500',
      slippageBps: 0,
      commissionPerOrder: '0',
      commissionPerShare: '0',
      maxOrderNotional: '1200',
    });
    expect(portfolio.maxOrderNotional).toBe('1200.00');
    const limitBuy = { ticker: TICKER, side: 'buy', type: 'limit', limitPrice: '90' } as const;

    // Ten at Monday's close of 100 fits; a limit order for six more at 90
    // doesn't fit beside it once the first has filled.
    await orders.place(userId, portfolio.id, 'a', buyTen, at(TUE, '15:00'));
    await expect(
      orders.place(userId, portfolio.id, 'b', { ...limitBuy, quantity: '6' }, at(TUE, '15:01')),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    // Five do, and then the cash they hold isn't free for a third order.
    const { order: resting } = await orders.place(
      userId,
      portfolio.id,
      'c',
      { ...limitBuy, quantity: '5' },
      at(TUE, '15:02'),
    );
    expect(resting.status).toBe('open');
    const third = { ...limitBuy, quantity: '1' };
    expect(await orders.preview(userId, portfolio.id, third, at(TUE, '15:03'))).toMatchObject({
      timing: 'next_session',
      fillSession: WED,
      notional: '90.00',
      cashAfter: '410.00',
      refusal: { code: 'insufficient_cash' },
    });

    // Over the limit per order, and more shares than are held.
    await expect(
      orders.place(userId, portfolio.id, 'd', { ...buyTen, quantity: '13' }, at(TUE, '15:04')),
    ).rejects.toThrow(/limit of 1200.00 per order/);
    await expect(
      orders.place(userId, portfolio.id, 'e', { ...buyTen, side: 'sell', quantity: '11' }, at(TUE, '15:05')),
    ).rejects.toThrow(/Short selling/);

    // Only the two accepted orders exist: a refusal stores nothing.
    expect(await prisma.order.count({ where: { portfolioId: portfolio.id } })).toBe(2);
  });

  it('settles a split, a resting order, and a dividend from stored market data', async () => {
    // Opened on Monday: corporate actions are read from the ledger's first
    // day on, so the portfolio must be older than the ones below.
    const portfolio = await portfolios.create(
      userId,
      {
        name: 'Corporate actions',
        startingCash: '10000',
        slippageBps: 0,
        commissionPerOrder: '0',
        commissionPerShare: '0',
      },
      at(MON, '12:00'),
    );
    await orders.place(userId, portfolio.id, 'buy', buyTen, at(TUE, '15:00'));
    // Resting from Tuesday evening, in Tuesday's shares.
    const { order: resting } = await orders.place(
      userId,
      portfolio.id,
      'sell',
      { ticker: TICKER, side: 'sell', type: 'limit', quantity: '10', limitPrice: '120' },
      at(TUE, '21:00'),
    );
    expect(resting.status).toBe('open');

    // Wednesday: a 10-for-1 split goes ex and the price is a tenth.
    // On the ex-date before its bar is stored, the last close is still
    // Monday's 100 in the old shares: valued in today's, the 100 new shares
    // are worth the same 1000, not 10000.
    await prisma.corporateAction.create({
      data: { symbolId, type: 'SPLIT', exDate: utcMidnight(WED), splitFrom: '1', splitTo: '10' },
    });
    const exDate = await portfolios.get(userId, portfolio.id, at(WED, '12:00'));
    expect(exDate.positions).toMatchObject([
      { quantity: '100.000000', lastPrice: '10', priceDate: MON, marketValue: '1000.00' },
    ]);
    expect(exDate.equity).toBe('10000.00');

    // Thursday: a dividend of 0.10 a share goes ex, paid the Monday after.
    await prisma.corporateAction.create({
      data: {
        symbolId,
        type: 'DIVIDEND',
        exDate: utcMidnight(THU),
        cashAmount: '0.1',
        payDate: utcMidnight('2026-06-08'),
      },
    });
    await prisma.candleDaily.createMany({ data: [bar(WED, '10'), bar(THU, '10')] });

    const state = await orders.settle(userId, portfolio.id, at(THU, '21:00'));

    // 10 shares worth 100 each became 100 worth 10 each: the same 1000.
    const [position] = positions(state);
    expect(format(position!.quantity)).toBe('100.000000');
    expect(format(position!.cost)).toBe('1000.00');
    expect(format(state.receivable)).toBe('10.00');
    expect(format(state.cash)).toBe('9000.00');

    const { orders: listed } = await orders.list(userId, portfolio.id);
    expect(listed.find((order) => order.id === resting.id)).toMatchObject({
      status: 'cancelled',
      closeReason: 'split',
    });
    // Cancelled is final, and saying so again is not an error.
    const again = await orders.cancel(userId, portfolio.id, resting.id);
    expect(again.status).toBe('cancelled');

    // Read today, long after the pay date: the dividend is cash, and the
    // shares are worth what they cost (100 at Thursday's close of 10).
    const books = await portfolios.get(userId, portfolio.id);
    expect(books).toMatchObject({
      cash: '9010.00',
      dividendIncome: '10.00',
      dividendsReceivable: '0.00',
      marketValue: '1000.00',
      unrealizedPnl: '0.00',
      equity: '10010.00',
      positions: [
        {
          ticker: TICKER,
          quantity: '100.000000',
          cost: '1000.00',
          lastPrice: '10',
          priceDate: THU,
          marketValue: '1000.00',
          unrealizedPnl: '0.00',
        },
      ],
    });
    const kinds = await prisma.ledgerTransaction.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { seq: 'asc' },
      select: { kind: true },
    });
    expect(kinds.map((row) => row.kind)).toEqual([
      'DEPOSIT',
      'BUY',
      'SPLIT',
      'DIVIDEND',
      'DIVIDEND_PAYMENT',
    ]);
  });
});
