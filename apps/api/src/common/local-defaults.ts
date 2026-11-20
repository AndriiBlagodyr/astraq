// Connection defaults that match `pnpm infra:up` (infra/docker/compose.yml),
// so a fresh clone runs with no .env. Shared by the env schema and
// prisma.config.ts; production never falls back to them (see env.ts).
export const LOCAL_DEFAULTS = {
  DATABASE_URL: 'postgres://veracand:veracand@localhost:5432/veracand',
  REDIS_URL: 'redis://localhost:6379',
  CORS_ORIGINS: 'http://localhost:3000',
  JWT_SECRET: 'dev-secret-at-least-32-bytes-long!',
  // The same literal is the web's local default (apps/web/lib/env.ts).
  BFF_SHARED_SECRET: 'dev-bff-secret-at-least-32-bytes-long',
  // Jaeger's OTLP port in compose. Used in development only: tests and
  // production trace nowhere unless told to (env.ts).
  OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318',
} as const;
