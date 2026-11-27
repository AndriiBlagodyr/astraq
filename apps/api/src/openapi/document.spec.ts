import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { buildOpenApiDocument } from './document';

describe('buildOpenApiDocument', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication({ logger: false });
    configureApp(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents health with the shared schema and problem errors', () => {
    const document = buildOpenApiDocument(app);
    const ready = document.paths['/health/ready']?.get?.responses;

    expect(ready?.['200']).toMatchObject({
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/HealthStatus_Output' },
        },
      },
    });
    expect(ready?.default).toMatchObject({
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Problem_Output' },
        },
      },
    });
  });

  it('has no placeholder routes', () => {
    const document = buildOpenApiDocument(app);

    expect(Object.keys(document.paths)).toEqual([
      '/api/me',
      '/api/me/sessions',
      '/api/me/sessions/{id}',
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/refresh',
      '/api/auth/password',
      '/api/auth/logout',
      '/api/auth/logout-all',
      '/api/admin/queue',
      '/api/admin/queue/dead/retry',
      '/api/admin/access',
      '/api/admin/access/{id}',
      '/api/admin/access/{id}/revoke',
      '/api/admin/access/{id}/reset-password',
      '/health/live',
      '/health/ready',
      '/api/portfolios',
      '/api/portfolios/{id}',
      '/api/portfolios/{id}/activity',
      '/api/portfolios/{id}/equity',
      '/api/portfolios/{id}/transfers',
      '/api/portfolios/{id}/orders',
      '/api/portfolios/{id}/orders/preview',
      '/api/portfolios/{id}/orders/{orderId}/cancel',
      '/api/market/status',
      '/api/market/data-quality',
      '/api/symbols',
      '/api/symbols/{ticker}/candles',
      '/api/symbols/{ticker}/returns',
      '/api/watchlists',
      '/api/watchlists/{id}',
      '/api/watchlists/{id}/items',
      '/api/watchlists/{id}/items/order',
      '/api/watchlists/{id}/items/{ticker}',
    ]);
  });
});
