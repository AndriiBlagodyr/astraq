# apps/api — Veracand Node.js Backend

- Framework: NestJS 11. The api is the only writer of domain tables.
- Layering: `controller -> service -> repository -> db`. No DB calls in controllers.
- DB access: Prisma only. Use Prisma Client for models, Prisma Migrate for every schema change, and TypedSQL (`$queryRaw` as fallback) for hand-written candle and analytics queries. Hypertables and other TimescaleDB DDL go in `migrate dev --create-only` migrations edited by hand. MongoDB (Phase 4+) uses a second Prisma client with the MongoDB connector, not Mongoose. Don't add another ORM, query builder, or migration tool.
- Jobs/queues: BullMQ on Redis. Cron via `@nestjs/schedule`.
- Validation: Zod schemas shared from `packages/shared`; use `nestjs-zod` for DTO binding.
- Logging: pino with request-id middleware. No `console.log` in production paths.
- OpenAPI: `@nestjs/swagger` + `nestjs-zod`. Every handler declares `@ZodResponse({ status, type })`; controllers add `@ApiProblemResponses()`. `pnpm contract` (root) writes `openapi.json` and regenerates `packages/sdk`; commit both. CI fails on drift. See ADR 0004.
- Python jobs (backtests, forecasts): enqueue via BullMQ; persist the returned result in the api.
