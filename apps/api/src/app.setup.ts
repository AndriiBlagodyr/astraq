import { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { env } from './common/env';

/**
 * App-wide settings that shape requests and routes. Shared by `main.ts` and
 * the OpenAPI emitter, so the committed spec has the same paths as the server.
 */
export function configureApp(app: INestApplication) {
  // Trust the first hop (the host's load balancer), so req.ip is the address
  // that reached it. For calls from the web server that is the web server's
  // own address; rate limits key on the browser's instead when the BFF
  // vouches for it (common/rate-limit-key.ts).
  (app as NestExpressApplication).set('trust proxy', 1);

  app.useGlobalFilters(new AllExceptionsFilter());
  // Only listed origins may call the API from a browser. Any other origin
  // gets no CORS headers, so the browser blocks the response.
  app.enableCors({ origin: env.CORS_ORIGINS });
  app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready'] });
}
