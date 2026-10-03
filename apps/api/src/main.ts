import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { env } from './common/env';
import { buildOpenApiDocument } from './openapi/document';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  configureApp(app);

  // Interactive docs for local work; the committed openapi.json is the contract.
  if (env.NODE_ENV !== 'production') {
    SwaggerModule.setup('api/docs', app, buildOpenApiDocument(app));
  }

  await app.listen(env.PORT);
}

bootstrap();
