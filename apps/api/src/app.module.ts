import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, minutes } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { LoggerModule } from 'nestjs-pino';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AccountModule } from './account/account.module';
import { AuthModule } from './auth/auth.module';
import { env } from './common/env';
import { rateLimitKey } from './common/rate-limit-key';
import { RedisModule } from './common/redis.module';
import { RedisService } from './common/redis.service';
import { assignRequestId } from './common/request-id';
import { HealthModule } from './health/health.module';
import { LedgerModule } from './ledger/ledger.module';
import { SymbolsModule } from './symbols/symbols.module';
import { WatchlistsModule } from './watchlists/watchlists.module';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      // Each named throttler is a separate sliding window. Auth routes override
      // the default with @Throttle; other routes stay at 120 req/min. `ttl` is
      // in milliseconds, hence the helpers.
      useFactory: (redis: RedisService) => ({
        throttlers: [{ name: 'default', ttl: minutes(1), limit: 120 }],
        // One bucket per browser, not one for the whole web server.
        getTracker: (request) =>
          rateLimitKey(
            request as Parameters<typeof rateLimitKey>[0],
            env.BFF_SHARED_SECRET,
          ),
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        transport:
          env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        autoLogging: true,
        genReqId: assignRequestId,
      },
    }),
    AccountModule,
    AuthModule,
    HealthModule,
    LedgerModule,
    SymbolsModule,
    WatchlistsModule,
  ],
  providers: [
    // Rate-limit every route by client address; auth endpoints override limits.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Zod DTOs validate every request input and every @ZodResponse body.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
