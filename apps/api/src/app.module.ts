import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { LoggerModule } from 'nestjs-pino';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AuthModule } from './auth/auth.module';
import { env } from './common/env';
import { assignRequestId } from './common/request-id';
import { HealthModule } from './health/health.module';
import { SymbolsModule } from './symbols/symbols.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      // Each named throttler is a separate sliding window. Auth routes override
      // the default with @Throttle; other routes stay at 120 req/min.
      throttlers: [{ name: 'default', ttl: 60, limit: 120 }],
      storage: new ThrottlerStorageRedisService(new Redis(env.REDIS_URL)),
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
    AuthModule,
    HealthModule,
    SymbolsModule,
  ],
  providers: [
    // Rate-limit every route by the request IP; auth endpoints override limits.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Zod DTOs validate every request input and every @ZodResponse body.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
