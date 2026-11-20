# apps/api — Veracand Node.js Backend

- Framework: NestJS 11. The api is the only writer of domain tables.
- Layering: `controller -> service -> repository -> db`. No DB calls in controllers.
- Errors: a repository raises a domain error that extends `NotFoundError` or `ConflictError` (`src/common/domain-errors.ts`) and knows nothing about HTTP; `AllExceptionsFilter` maps the kind to 404 or 409 with the error's message. Services let these pass: no catch-and-rethrow. A service throws a Nest `HttpException` itself only for what it decides (a 400 on the request's content, a 422 for a ledger refusal).
- A portfolio's ledger is written in one place, `OrdersRepository.transact`, which settles the portfolio first. Don't add a second write path.
- An order is checked twice: at placement by `trading/risk.ts` (an estimate; a refusal is a 422 and nothing is stored) and at its fill by the ledger. `preview` in `trading/settlement.ts` is the one function behind both the 422 and `POST .../orders/preview`; don't give the preview endpoint its own logic.
- The session clock (`trading/market-hours.ts`) is pure: the exchange calendar is loaded by `MarketCalendarService` and passed in. A date the calendar doesn't cover falls back to weekdays, 09:30 to 16:00.
- DB access: Prisma only. Use Prisma Client for models, Prisma Migrate for every schema change, and TypedSQL (`$queryRaw` as fallback) for hand-written candle and analytics queries. Hypertables and other TimescaleDB DDL go in `migrate dev --create-only` migrations edited by hand. MongoDB (Phase 4+) uses a second Prisma client with the MongoDB connector, not Mongoose. Don't add another ORM, query builder, or migration tool.
- The Prisma Client in `src/generated/prisma` is generated on install (`postinstall`) and gitignored: never commit it. Migration folders keep the name Prisma gives them (`YYYYMMDDHHMMSS_name`, 14 digits), since Prisma applies them in name order; rename one only before it reaches a shared database.
- Jobs/queues: BullMQ on Redis. Cron via `@nestjs/schedule`.
- Validation: Zod schemas shared from `packages/shared`; use `nestjs-zod` for DTO binding.
- Logging: pino with request-id middleware. No `console.log` in production paths.
- Tracing: `src/tracing.ts` sets up OpenTelemetry and must stay the first import of `main.ts` (instrumentations patch modules as they load). Make a span of your own with `inSpan` from `common/span.ts`, which needs only `@opentelemetry/api` and is a no-op in tests and the CLIs. Don't import `tracing.ts` anywhere else.
- OpenAPI: `@nestjs/swagger` + `nestjs-zod`. Every handler declares `@ZodResponse({ status, type })`; controllers add `@ApiProblemResponses()`. `pnpm contract` (root) writes `openapi.json` and regenerates `packages/sdk`; commit both. CI fails on drift. See ADR 0004.
- Python jobs (backtests, forecasts): enqueue via BullMQ; persist the returned result in the api.
