import { HISTORY_FROM } from './history';
import { IngestionService } from './ingestion.service';
import { MarketDataRepository } from './market-data.repository';
import { OnDemandCandlesService } from './on-demand-candles.service';

describe('OnDemandCandlesService', () => {
  const seed = { ticker: 'ABNB', name: 'Airbnb, Inc.', exchange: 'XNAS' };
  const repository = {
    hasCandles: vi.fn(),
    findSeed: vi.fn().mockResolvedValue(seed),
  };
  const ingestion = { available: true, backfill: vi.fn() };
  const service = new OnDemandCandlesService(
    repository as unknown as MarketDataRepository,
    ingestion as unknown as IngestionService,
  );

  beforeEach(() => {
    ingestion.backfill.mockReset();
  });

  it('loads the full history once for a symbol without candles', async () => {
    repository.hasCandles.mockResolvedValue(false);
    let finish!: () => void;
    ingestion.backfill.mockReturnValue(new Promise<void>((r) => (finish = r)));

    // Two adds while the first load is in flight share it.
    const first = service.ensureCandles(42);
    const second = service.ensureCandles(42);
    finish();
    await Promise.all([first, second]);

    expect(ingestion.backfill).toHaveBeenCalledTimes(1);
    expect(ingestion.backfill).toHaveBeenCalledWith([seed], {
      from: HISTORY_FROM,
      to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  it('does nothing for a symbol that already has candles', async () => {
    repository.hasCandles.mockResolvedValue(true);
    await service.ensureCandles(42);
    expect(ingestion.backfill).not.toHaveBeenCalled();
  });

  it('swallows a provider failure: the watch succeeds, the next add retries', async () => {
    repository.hasCandles.mockResolvedValue(false);
    ingestion.backfill.mockRejectedValue(new Error('Alpaca down'));
    await expect(service.ensureCandles(42)).resolves.toBeUndefined();
    ingestion.backfill.mockResolvedValue(undefined);
    await service.ensureCandles(42);
    expect(ingestion.backfill).toHaveBeenCalledTimes(2);
  });

  it('is a no-op without a provider', async () => {
    const offline = new OnDemandCandlesService(
      repository as unknown as MarketDataRepository,
      { available: false } as unknown as IngestionService,
    );
    repository.hasCandles.mockClear();
    await offline.ensureCandles(42);
    expect(repository.hasCandles).not.toHaveBeenCalled();
  });
});
