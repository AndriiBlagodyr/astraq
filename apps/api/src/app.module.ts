import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { env } from './common/env';
import { assignRequestId } from './common/request-id';
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
        genReqId: assignRequestId,
      },
    }),
    HealthModule,
    PredictionsModule,
  ],
})
export class AppModule {}
