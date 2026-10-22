# packages/shared — cross-service schemas

- Zod schemas for every shape that crosses a service boundary (web ↔ api now, api ↔ ml from Phase 5). See ADR 0004.
- One file per domain (`health.ts`, `problem.ts`, later `symbols.ts`, `candles.ts`), re-exported from `src/index.ts`. Export the schema and its inferred type (`export type X = z.infer<typeof XSchema>`).
- Give a schema `.meta({ id: "Name" })` when it should be a named component in the OpenAPI spec.
- No runtime code beyond schemas: no fetch, no Nest, no React. `zod` is a peer dependency; keep it that way so every consumer shares one copy.
- Builds ESM + CommonJS with tsdown (`pnpm --filter @astraq/shared build`). `apps/api` reads the CommonJS build.
- After changing a schema an endpoint uses, run `pnpm contract` at the root and commit the regenerated `apps/api/openapi.json` and `packages/sdk/src/schema.ts`.
