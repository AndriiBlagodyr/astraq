import { BootstrapService } from './bootstrap/bootstrap.service';
import { BOOTSTRAP_FROM } from './bootstrap/bootstrap-symbols';
import { MarketDataRepository } from './market-data.repository';
import { OnDemandCandlesService } from './on-demand-candles.service';

describe('OnDemandCandlesService', () => {
  const seed = { ticker: 'ABNB', name: 'Airbnb, Inc.', exchange: 'XNAS' };
  const repository = {
    hasCandles: vi.fn(),
    findSeed: vi.fn().mockResolvedValue(seed),
  };
  const bootstrap = { run: vi.fn() };
  const service = new OnDemandCandlesService(
    repository as unknown as MarketDataRepository,
    bootstrap as unknown as BootstrapService,
  );

  beforeEach(() => {
    bootstrap.run.mockReset();
  });

  it('loads the full history once for a symbol without candles', async () => {
    repository.hasCandles.mockResolvedValue(false);
    let finish!: () => void;
    bootstrap.run.mockReturnValue(new Promise<void>((r) => (finish = r)));

    // Two adds while the first load is in flight share it.
    const first = service.ensureCandles(42);
    const second = service.ensureCandles(42);
    finish();
    await Promise.all([first, second]);

    expect(bootstrap.run).toHaveBeenCalledTimes(1);
    expect(bootstrap.run).toHaveBeenCalledWith([seed], {
      from: BOOTSTRAP_FROM,
      to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  it('does nothing for a symbol that already has candles', async () => {
    repository.hasCandles.mockResolvedValue(true);
    await service.ensureCandles(42);
    expect(bootstrap.run).not.toHaveBeenCalled();
  });

  it('swallows a provider failure: the watch succeeds, the next add retries', async () => {
    repository.hasCandles.mockResolvedValue(false);
    bootstrap.run.mockRejectedValue(new Error('Alpaca down'));
    await expect(service.ensureCandles(42)).resolves.toBeUndefined();
    bootstrap.run.mockResolvedValue(undefined);
    await service.ensureCandles(42);
    expect(bootstrap.run).toHaveBeenCalledTimes(2);
  });

  it('is a no-op without Alpaca keys', async () => {
    const offline = new OnDemandCandlesService(
      repository as unknown as MarketDataRepository,
      null,
    );
    repository.hasCandles.mockClear();
    await offline.ensureCandles(42);
    expect(repository.hasCandles).not.toHaveBeenCalled();
  });
});
