// Writes the JSON Schema of the shapes Python reads (ROADMAP Phase 5 item
// 1, ADR 0012). Zod is the source; `services/ml` generates its Pydantic
// models from these files (`pnpm contract:ml`), and CI fails when either
// step leaves a diff.
//
// Reads the built package, so run it after `pnpm --filter @astraq/shared
// build` (`pnpm contract` does both).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { StrategyDefinitionSchema } from "../dist/index.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** File name under `json-schema/` to the schema it holds. */
const schemas = {
  "strategy.schema.json": StrategyDefinitionSchema,
};

for (const [file, schema] of Object.entries(schemas)) {
  const path = resolve(root, "json-schema", file);
  const document = z.toJSONSchema(schema, { target: "draft-2020-12" });
  mkdirSync(dirname(path), { recursive: true });
  // LF and a final newline on every platform: the file is compared in CI.
  writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`);
  console.log(`wrote ${path}`);
}
