# ADR 0004: NestJS + OpenAPI-generated SDK as the web ↔ api contract

- Status: Accepted
- Date: 2026-10-03

## Context

From Phase 1 the web app reads real data from `apps/api`: symbols and candles first, then watchlists, orders, and backtests. Every one of those shapes is written in at least three places: the API's validation, the API's response, and the web code that reads it. If they're kept in sync by hand, they will drift, and the drift shows up at runtime in production instead of at compile time.

The contract has to:

- have one source per shape, in TypeScript, reusable by both apps
- validate requests **and** responses on the API, so the documented shape is the real one
- give the web app typed calls without hand-written fetch wrappers
- fail CI when the code and the contract disagree
- stay small and readable: this is a learning repo, and generated code you can't read teaches nothing

### Options considered

| Option | Verdict |
|---|---|
| **Zod in `packages/shared` → `nestjs-zod` + `@nestjs/swagger` → committed `openapi.json` → `openapi-typescript` + `openapi-fetch`** | **Chosen.** Zod is already the env validator on both apps. The SDK is one generated type file plus a runtime of a few KB. |
| Share Zod types directly, no OpenAPI | Simplest, but leaves no language-neutral contract, no API docs, and nothing for a non-TypeScript client. |
| `class-validator` DTOs + Swagger | Nest's default. A second validation library next to Zod, and the types live in classes the web app can't import. |
| tRPC / ts-rest | Tight TypeScript coupling. tRPC doesn't fit Nest's controllers; neither produces a contract that Python or curl users can read. |
| OpenAPI Generator / Orval | Generates large client classes or React Query hooks. Heavier than needed, and harder to read than `paths` types plus `openapi-fetch`. |
| GraphQL | Solves a fetch-shape problem this app doesn't have yet. Listed as a stretch comparison in the roadmap. |

## Decision

### 1. Schemas live in `packages/shared`

Every shape that crosses a service boundary is a Zod schema in `@astraq/shared`. Shapes reused across endpoints get `.meta({ id })`, so they become named components in the spec.

The package builds both ESM and CommonJS (tsdown): `apps/api` compiles to CommonJS and resolves packages without `exports`, so the package also sets `main` and `types`. `zod` is a peer dependency, so the API, the web app, and `nestjs-zod` share one copy (`nestjs-zod` relies on `instanceof`).

### 2. The API validates both directions

- `createZodDto(Schema)` turns a shared schema into a Nest DTO.
- A global `ZodValidationPipe` validates every body, query, and param.
- A global `ZodSerializerInterceptor` plus `@ZodResponse({ status, type })` on each handler validates every response. `@ZodResponse` also sets the documented response and makes TypeScript check the handler's return type, so runtime, compile time, and docs come from one declaration.
- Errors stay RFC 9457 problem details (`ProblemSchema`). Validation failures add `errors: [{ path, message }]`. `@ApiProblemResponses()` documents them as each endpoint's `default` response.

### 3. `openapi.json` is generated and committed

- `pnpm contract` builds the shared package, writes `apps/api/openapi.json` (`openapi:emit`), and regenerates `packages/sdk/src/schema.ts`.
- `openapi:emit` runs the compiled app (`nest build && node dist/openapi/emit`). Nest's dependency injection needs decorator metadata, which only the TypeScript compiler emits, not `tsx` or esbuild. The app is created but never initialized or started, so no database connection opens.
- `main.ts` and the emitter share `configureApp()`, so the committed spec has the server's real paths (the `/api` prefix, health excluded).
- It's an explicit command rather than a build step. Booting the app on every build is slow, and CI enforces the same guarantee.
- CI runs `pnpm contract`, then `git diff --exit-code` on both generated files. Any endpoint change without a regenerated contract fails the PR.
- Swagger UI is served at `/api/docs` outside production.

### 4. The SDK is types plus `openapi-fetch`

`@astraq/sdk` exports `createApiClient(baseUrl)`, a `createClient<paths>()` from `openapi-fetch`, and re-exports the generated `paths`, `components`, and `operations` types. Calls look like `api.GET("/api/symbols/{ticker}/candles", { params: { path: { ticker } } })` and are typed end to end. The web app is the BFF: only its server code calls the API.

## Consequences

- Changing an endpoint takes four steps: shared schema → DTO/handler → `pnpm contract` → commit the regenerated files. The CI check turns forgetting the third step into a red build, not a production bug.
- Response schemas get an `_Output` suffix in the spec (`HealthStatus_Output`). `nestjs-zod` names them separately from inputs because coercion and defaults can make them differ. Web code reads them as `components["schemas"]["HealthStatus_Output"]`, or infers them from the call.
- Generated files show up in diffs. They're small, and reviewing them is how you see what a contract change really did.
- The `/health` endpoints were the first to move over. `/api/predictions/summary`, a placeholder, was deleted instead of documented.
- Python consumers (Phase 5) will read JSON Schema exported from the same Zod schemas (`z.toJSONSchema`), with a drift check of their own.
