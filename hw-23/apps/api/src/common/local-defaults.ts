// Connection defaults that match `pnpm infra:up` (infra/docker/compose.yml),
// so a fresh clone runs with no .env. Shared by the env schema and
// prisma.config.ts; production never falls back to them (see env.ts).
export const LOCAL_DEFAULTS = {
  DATABASE_URL: 'postgres://veracand:veracand@localhost:5432/veracand',
  REDIS_URL: 'redis://localhost:6379',
  CORS_ORIGINS: 'http://localhost:3000',
} as const;
