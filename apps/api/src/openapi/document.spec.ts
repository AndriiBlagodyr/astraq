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
      '/health/live',
      '/health/ready',
    ]);
  });
});
