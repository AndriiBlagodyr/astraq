import { sessionCalendar } from '../../trading/market-hours';
import type { MarketCalendarService } from '../market-calendar.service';
import type { MarketDataQueue } from './market-data.queue';
import type { RefreshService } from './refresh.service';
import { SessionScheduler } from './session-scheduler';

// Thanksgiving week 2026 as the exchange calendar has it: Wednesday a full
// day, Thursday closed, Friday closing at 13:00 New York (18:00 UTC).
const session = (date: string, closeUtc: string) => ({
  date,
  open: new Date(`${date}T14:30:00.000Z`),
  close: new Date(`${date}T${closeUtc}:00.000Z`),
});
const thanksgivingWeek = sessionCalendar('2026-11-16', '2026-12-04', [
  session('2026-11-25', '21:00'),
  session('2026-11-27', '18:00'),
  session('2026-11-30', '21:00'),
]);

describe('SessionScheduler', () => {
  const addOnce = vi.fn<MarketDataQueue['addOnce']>();
  const enqueueSessionRefresh = vi.fn<RefreshService['enqueueSessionRefresh']>();
  const around = vi.fn<MarketCalendarService['around']>();
  const scheduler = new SessionScheduler(
    { around } as unknown as MarketCalendarService,
    { enqueueSessionRefresh } as unknown as RefreshService,
    { addOnce } as unknown as MarketDataQueue,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    addOnce.mockResolvedValue(true);
    around.mockResolvedValue(thanksgivingWeek);
  });

  it('skips the holiday and schedules the half day for half an hour after its early close', async () => {
    // Thursday noon New York, the market closed for Thanksgiving.
    const now = new Date('2026-11-26T17:00:00.000Z');

    expect(await scheduler.ensure(now)).toEqual([
      // Wednesday closed yesterday: due at once, for a worker that missed it.
      { session: '2026-11-25', runsAt: now.toISOString(), added: true },
      { session: '2026-11-27', runsAt: '2026-11-27T18:30:00.000Z', added: true },
    ]);
    expect(addOnce.mock.calls).toEqual([
      ['session-close', { session: '2026-11-25' }, 'session-close-2026-11-25', 0],
      [
        'session-close',
        { session: '2026-11-27' },
        'session-close-2026-11-27',
        25.5 * 60 * 60_000,
      ],
    ]);
  });

  it('schedules the session trading now, not the one after', async () => {
    const now = new Date('2026-11-27T15:00:00.000Z');
    const [, next] = await scheduler.ensure(now);
    expect(next).toMatchObject({
      session: '2026-11-27',
      runsAt: '2026-11-27T18:30:00.000Z',
    });
  });

  it('falls back to weekdays closing at 16:00 without a calendar', async () => {
    around.mockResolvedValue(null);
    // Saturday: Friday is the last close, Monday the next.
    const scheduled = await scheduler.ensure(new Date('2026-11-21T12:00:00.000Z'));
    expect(scheduled.map((close) => [close.session, close.runsAt])).toEqual([
      ['2026-11-20', '2026-11-21T12:00:00.000Z'],
      ['2026-11-23', '2026-11-23T21:30:00.000Z'],
    ]);
  });

  it('on a close, schedules the next session before enqueueing the refresh', async () => {
    enqueueSessionRefresh.mockResolvedValue(5);
    addOnce.mockResolvedValueOnce(false);
    // Wednesday's job, running half an hour after its close.
    const result = await scheduler.close(
      '2026-11-25',
      new Date('2026-11-25T21:30:00.000Z'),
    );

    expect(result).toEqual({
      session: '2026-11-25',
      jobs: 5,
      next: '2026-11-27',
      nextRunsAt: '2026-11-27T18:30:00.000Z',
    });
    expect(enqueueSessionRefresh).toHaveBeenCalledWith('2026-11-25');
    expect(addOnce.mock.invocationCallOrder[1]).toBeLessThan(
      enqueueSessionRefresh.mock.invocationCallOrder[0],
    );
  });
});
