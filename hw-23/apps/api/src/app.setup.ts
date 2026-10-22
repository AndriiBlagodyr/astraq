import { INestApplication } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { env } from './common/env';

/**
 * App-wide settings that shape requests and routes. Shared by `main.ts` and
 * the OpenAPI emitter, so the committed spec has the same paths as the server.
 */
export function configureApp(app: INestApplication) {
  app.useGlobalFilters(new AllExceptionsFilter());
  // Only listed origins may call the API from a browser. Any other origin
  // gets no CORS headers, so the browser blocks the response.
  app.enableCors({ origin: env.CORS_ORIGINS });
  app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready'] });
}
