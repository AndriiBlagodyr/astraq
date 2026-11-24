import { randomUUID } from 'node:crypto';
import { UnrecoverableError } from 'bullmq';
import { ProviderError } from '../provider/market-data-provider';
import { MarketDataQueue } from './market-data.queue';
import { MarketDataWorker, type Process } from './market-data.worker';

// Retries, backoff, and the dead-letter queue against real Redis
// (`pnpm --filter @astraq/api test:integration`). Each test gets queues of
// its own and a worker whose job is a stub and whose backoff is a few
// milliseconds: what is under test is what the worker does with a failure.

const payload = { tickers: ['AAPL'], from: '2026-11-16', to: '2026-11-20' };
const down = () => new ProviderError('alpaca', 'unavailable', 'alpaca is down');

async function until(check: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for the queue');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

describe('MarketDataWorker (Redis)', () => {
  let queue: MarketDataQueue;
  let worker: MarketDataWorker;
  const delays: Array<[number, number | null]> = [];

  const start = (process: Process) => {
    worker = new MarketDataWorker(queue, process, (attemptsMade, retryAfter) => {
      delays.push([attemptsMade, retryAfter]);
      return 5;
    });
    worker.onApplicationBootstrap();
  };

  beforeEach(() => {
    queue = new MarketDataQueue(`itest-${randomUUID()}`);
    delays.length = 0;
  });

  afterEach(async () => {
    await worker.onApplicationShutdown();
    await queue.obliterate();
    await queue.onModuleDestroy();
  });

  it('retries a failure that can pass, with backoff, until the job succeeds', async () => {
    const run = vi
      .fn<Process>()
      .mockRejectedValueOnce(down())
      .mockRejectedValueOnce(
        new ProviderError('alpaca', 'rate_limited', 'slow down', 4000),
      )
      .mockResolvedValue({ bars: 5 });
    start(run);
    await queue.add('eod-refresh', [payload]);

    await until(async () => (await queue.counts()).completed === 1);
    expect(run).toHaveBeenCalledTimes(3);
    expect(run).toHaveBeenLastCalledWith('eod-refresh', payload);
    // Asked after the first and second failure, the second time with the
    // wait the provider named.
    expect(delays).toEqual([
      [1, null],
      [2, 4000],
    ]);
    expect(await queue.counts()).toMatchObject({ failed: 0, dead: 0 });
  });

  it('dead-letters a job that runs out of attempts, once', async () => {
    const run = vi.fn<Process>().mockRejectedValue(down());
    start(run);
    await queue.add('eod-refresh', [payload]);

    await until(async () => (await queue.counts()).failed === 1);
    expect(run).toHaveBeenCalledTimes(8);
    expect(await queue.listDead()).toEqual([
      expect.objectContaining({
        name: 'eod-refresh',
        data: payload,
        error: 'alpaca is down',
        attempts: 8,
      }),
    ]);
  });

  it('gives up at once on a failure a retry cannot fix', async () => {
    const run = vi
      .fn<Process>()
      .mockRejectedValueOnce(
        new ProviderError('alpaca', 'rejected', 'alpaca says 403'),
      )
      .mockRejectedValueOnce(new UnrecoverableError('Unknown symbol NOPE'));
    start(run);
    await queue.add('eod-refresh', [payload]);
    await queue.add('symbol-backfill', [{ ticker: 'NOPE' }]);

    await until(async () => (await queue.counts()).failed === 2);
    expect(run).toHaveBeenCalledTimes(2);
    expect(delays).toEqual([]);
    expect((await queue.listDead()).map((letter) => letter.attempts)).toEqual([
      1, 1,
    ]);
  });

  it('puts a dead letter back on the queue with its payload', async () => {
    const run = vi
      .fn<Process>()
      .mockRejectedValueOnce(new ProviderError('alpaca', 'rejected', 'bad key'))
      .mockResolvedValue({ bars: 5 });
    start(run);
    await queue.add('eod-refresh', [payload]);
    await until(async () => (await queue.counts()).dead === 1);

    expect(await queue.retryDead()).toBe(1);
    await until(async () => (await queue.counts()).completed === 1);
    expect(run).toHaveBeenLastCalledWith('eod-refresh', payload);
    expect((await queue.counts()).dead).toBe(0);
  });
});
