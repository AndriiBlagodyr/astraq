# packages/shared — cross-service schemas

- Zod schemas for every shape that crosses a service boundary (web ↔ api now, api ↔ ml from Phase 5). See ADR 0004.
- One file per domain (`health.ts`, `problem.ts`, later `symbols.ts`, `candles.ts`), re-exported from `src/index.ts`. Export the schema and its inferred type (`export type X = z.infer<typeof XSchema>`).
- Give a schema `.meta({ id: "Name" })` when it should be a named component in the OpenAPI spec.
- No runtime code beyond schemas: no fetch, no Nest, no React. `zod` is a peer dependency; keep it that way so every consumer shares one copy.
- Builds ESM + CommonJS with tsdown (`pnpm --filter @astraq/shared build`). `apps/api` reads the CommonJS build.
- `src/strategies.ts` is the strategy DSL, read by Python too (ADR 0012). `pnpm contract` writes its JSON Schema to `json-schema/` and `pnpm contract:ml` generates `services/ml/app/contracts/` from that; commit both. In that file use only what JSON Schema can carry: no `.refine`, `.transform`, or `.default`, no lookahead in a pattern, `z.strictObject` with every key required (`null` for absent). A new rule needs a case in `fixtures/strategies.json`, which both languages run. A new shape for Python is added to `scripts/emit-json-schema.mjs`.
- `fixtures/` holds contracts as cases, run by both languages: `fill-model.json` (ADR 0008) and `strategies.json`. Change a rule there first.
- After changing a schema an endpoint uses, run `pnpm contract` at the root and commit the regenerated `apps/api/openapi.json` and `packages/sdk/src/schema.ts`.
