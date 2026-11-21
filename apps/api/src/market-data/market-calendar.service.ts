import { Injectable, Logger } from '@nestjs/common';
import { toIsoDate, utcMidnight } from '../common/dates';
import type { MarketStatus } from '@astraq/shared';
import {
  marketStatus,
  sessionCalendar,
  sessionDate,
  type MarketSession,
  type SessionCalendar,
} from '../trading/market-hours';
import { AlpacaClient } from './alpaca/alpaca.client';
import { toMarketSessions } from './alpaca/alpaca.mapper';
import { MarketDataRepository } from './market-data.repository';
import type { DateRange } from './market-data.types';

/** `date` moved by a number of calendar days. */
function shift(date: string, days: number): string {
  const moved = utcMidnight(date);
  moved.setUTCDate(moved.getUTCDate() + days);
  return toIsoDate(moved);
}

/** How far ahead the stored calendar must reach before it's reloaded. */
const MIN_DAYS_AHEAD = 7;
/** What a reload asks for: last week, for the record, and a year ahead. */
const RELOAD_DAYS_BACK = 7;
const RELOAD_DAYS_AHEAD = 365;
/** After a failed reload, how long to leave Alpaca alone. */
const RETRY_AFTER_MS = 10 * 60_000;

/**
 * The exchange calendar (ROADMAP Phase 3 item 5): which days the market
 * trades and when each closes, loaded from Alpaca into `market_sessions`
 * and read back as the `SessionCalendar` the session clock takes
 * (`trading/market-hours.ts`).
 *
 * The calendar keeps itself loaded: a read that finds less than a week
 * stored ahead of the day it's asked about reloads the next year inline,
 * one request to Alpaca. Until a job exists (Phase 4) that is what stops
 * the table from running out. A failed reload is logged, never thrown, and
 * the reader gets what's stored: for a day the calendar doesn't cover the
 * clock falls back to "weekdays, 09:30 to 16:00".
 */
@Injectable()
export class MarketCalendarService {
  private readonly logger = new Logger(MarketCalendarService.name);
  /** One reload at a time; concurrent readers await the same one. */
  private reloading: Promise<void> | null = null;
  private retryAfter = 0;

  constructor(
    private readonly repository: MarketDataRepository,
    /** Null when the api runs without Alpaca keys (see MarketDataModule). */
    private readonly alpaca: AlpacaClient | null,
  ) {}

  /**
   * Replaces the stored calendar between two dates with Alpaca's. Returns
   * how many sessions are new or changed, so a second run reports 0.
   */
  async sync(range: DateRange): Promise<number> {
    if (this.alpaca === null) {
      throw new Error('The exchange calendar needs Alpaca keys');
    }
    const days = await this.alpaca.calendar(range);
    const sessions = toMarketSessions(days).filter(
      (session) => session.date >= range.from && session.date <= range.to,
    );
    const changed = await this.repository.replaceMarketSessions(range, sessions);
    this.logger.log(
      `Exchange calendar ${range.from} to ${range.to}: ` +
        `${sessions.length} sessions, ${changed} new or changed`,
    );
    return changed;
  }

  /**
   * The calendar around an instant: from the day before it to two weeks
   * after, as far as it is stored. Null when nothing in that window is.
   */
  async around(instant: Date): Promise<SessionCalendar | null> {
    const day = sessionDate(instant);
    const window = { from: shift(day, -1), to: shift(day, 14) };

    let stored = await this.repository.findMarketSessions(window);
    if (
      this.alpaca !== null &&
      (stored.last === null || stored.last < shift(day, MIN_DAYS_AHEAD)) &&
      (await this.reload(day))
    ) {
      stored = await this.repository.findMarketSessions(window);
    }

    if (stored.first === null || stored.last === null) return null;
    const from = stored.first > window.from ? stored.first : window.from;
    const to = stored.last < window.to ? stored.last : window.to;
    return from > to ? null : sessionCalendar(from, to, stored.sessions);
  }

  /**
   * Whether the market trades at `now` and the session that opens next
   * (`GET /api/market/status`), by the calendar where it is stored.
   */
  async status(now: Date = new Date()): Promise<MarketStatus> {
    const { open, session, next, fromCalendar } = marketStatus(
      now,
      await this.around(now),
    );
    const times = ({ date, open, close }: MarketSession) => ({
      date,
      opensAt: open.toISOString(),
      closesAt: close.toISOString(),
    });
    return {
      asOf: now.toISOString(),
      open,
      session: session && times(session),
      nextSession: times(next),
      calendar: fromCalendar ? 'exchange' : 'weekdays',
    };
  }

  /** Reloads the year after `day`; false when it failed or is backing off. */
  private async reload(day: string): Promise<boolean> {
    if (Date.now() < this.retryAfter) return false;
    this.reloading ??= this.sync({
      from: shift(day, -RELOAD_DAYS_BACK),
      to: shift(day, RELOAD_DAYS_AHEAD),
    })
      .then(() => undefined)
      .finally(() => {
        this.reloading = null;
      });
    try {
      await this.reloading;
      return true;
    } catch (error) {
      this.retryAfter = Date.now() + RETRY_AFTER_MS;
      this.logger.warn(
        'Loading the exchange calendar failed: ' +
          (error instanceof Error ? error.message : String(error)),
      );
      return false;
    }
  }
}
