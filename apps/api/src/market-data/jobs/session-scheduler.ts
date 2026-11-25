import { Injectable } from '@nestjs/common';
import {
  lastClosedSession,
  nextSessionToClose,
} from '../../trading/market-hours';
import { MarketCalendarService } from '../market-calendar.service';
import { closeDelayMs, sessionCloseJobId } from './market-data.jobs';
import type { JobResult } from './market-data.processor';
import { MarketDataQueue } from './market-data.queue';
import { RefreshService } from './refresh.service';

/** How far back the calendar is read to find the last session that closed. */
const CALENDAR_DAYS_BACK = 10;

/** A session's `session-close` job: when it runs, and whether this call added it. */
export type ScheduledClose = { session: string; runsAt: string; added: boolean };

/**
 * Runs the refresh after every close, from the exchange calendar (ROADMAP
 * Phase 4 item 3).
 *
 * There is no cron line and no timer in a process. Each trading day has one
 * delayed job on the queue, `session-close`, due half an hour after that
 * day's close as the calendar gives it, so a half day's job is due at 13:30
 * New York and a holiday has none. When the job runs it first schedules the
 * next session's job and then enqueues the day's work: the chain carries
 * itself, and the schedule survives a restart because it lives in Redis.
 *
 * `ensure` is what starts the chain and what repairs it. It asks for two
 * jobs: the next session to close, and the last one that already has. The
 * second is the catch-up: a worker that was down over a close finds that
 * session's job missing and runs it at once, and a refresh always reaches
 * back to each symbol's last bar (`planRefresh`), so one late job fills
 * however many days were missed. Both are asked for by id (`addOnce`), so
 * asking again, on every worker start and at every close, adds nothing.
 *
 * Where the calendar isn't stored (a machine without Alpaca keys) the clock
 * falls back to weekdays closing at 16:00, like the order rules do: a
 * holiday then gets a job that finds no new bars.
 */
@Injectable()
export class SessionScheduler {
  constructor(
    private readonly calendar: MarketCalendarService,
    private readonly refresh: RefreshService,
    private readonly queue: MarketDataQueue,
  ) {}

  /**
   * Makes sure the last closed session and the next one to close each have
   * their job. Returns both, the earlier first.
   */
  async ensure(now: Date = new Date()): Promise<ScheduledClose[]> {
    const calendar = await this.calendar.around(now, CALENDAR_DAYS_BACK);
    const sessions = [
      lastClosedSession(now, calendar),
      nextSessionToClose(now, calendar),
    ];
    const scheduled: ScheduledClose[] = [];
    for (const session of sessions) {
      const delay = closeDelayMs(session.close, now);
      const added = await this.queue.addOnce(
        'session-close',
        { session: session.date },
        sessionCloseJobId(session.date),
        delay,
      );
      scheduled.push({
        session: session.date,
        runsAt: new Date(now.getTime() + delay).toISOString(),
        added,
      });
    }
    return scheduled;
  }

  /**
   * The work of a `session-close` job. The next job is scheduled before
   * anything else: whatever fails after that, the chain is already carried.
   * The refreshes go on last and all at once (`addThen`), so a retry of
   * this job after a failure hasn't enqueued them twice.
   */
  async close(session: string, now: Date = new Date()): Promise<JobResult> {
    const [, next] = await this.ensure(now);
    const jobs = await this.refresh.enqueueSessionRefresh(session);
    return { session, jobs, next: next.session, nextRunsAt: next.runsAt };
  }
}
