import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { buildOpenApiDocument } from './document';

/**
 * Writes apps/api/openapi.json, the committed contract that packages/sdk is
 * generated from. Runs from dist/ (`pnpm openapi:emit`): Nest needs decorator
 * metadata, which only the real compiler emits. The app is created but never
 * initialized or started, so no module opens a connection.
 */
async function emit() {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);

  const document = buildOpenApiDocument(app);
  const target = resolve(__dirname, '../../openapi.json');
  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);

  await app.close();
  console.log(`Wrote ${target}`);
}

emit().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
