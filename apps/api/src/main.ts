import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { env } from './common/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors();
  app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready'] });

  await app.listen(env.PORT);
}

bootstrap();
