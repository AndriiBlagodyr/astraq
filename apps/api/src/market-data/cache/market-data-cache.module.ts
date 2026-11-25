import { Module } from '@nestjs/common';
import { CacheStore, RedisCacheStore } from '../../common/cache-store';
import { RedisModule } from '../../common/redis.module';
import { MarketDataCache } from './market-data-cache';

/**
 * The market data cache, for the modules that read through it
 * (`SymbolsModule`) and the ones that write market data and so must
 * invalidate it (`MarketDataModule`, and `BootstrapModule` for the CLIs and
 * the worker). The Redis client connects on its first command, so a CLI
 * that writes nothing never opens a connection.
 */
@Module({
  imports: [RedisModule],
  providers: [
    { provide: CacheStore, useClass: RedisCacheStore },
    MarketDataCache,
  ],
  exports: [MarketDataCache],
})
export class MarketDataCacheModule {}
