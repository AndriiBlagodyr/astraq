import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { env } from './common/env';
import { HealthModule } from './health/health.module';
import { PredictionsModule } from './predictions/predictions.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        transport:
          env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        autoLogging: true,
        genReqId: (req) =>
          (req.headers['x-request-id'] as string) ?? crypto.randomUUID(),
      },
    }),
    HealthModule,
    PredictionsModule,
  ],
})
export class AppModule {}
