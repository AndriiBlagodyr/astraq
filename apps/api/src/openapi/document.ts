import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

/** The OpenAPI document for the configured app (call after `configureApp`). */
export function buildOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Veracand API')
    .setDescription(
      'Domain API for Veracand. The web app calls it through @astraq/sdk, generated from this document.',
    )
    .setVersion('0.1.0')
    .setOpenAPIVersion('3.1.0')
    .build();

  // nestjs-zod post-processes the Zod-derived schemas; required for valid output.
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
}
