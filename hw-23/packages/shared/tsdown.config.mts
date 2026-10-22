import { defineConfig } from "tsdown";

/*
 * Both formats: apps/api compiles to CommonJS, apps/web and packages/sdk are
 * ESM. zod stays an import, so every consumer shares the app's single copy
 * (nestjs-zod checks schemas with instanceof).
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  platform: "neutral",
  dts: true,
  sourcemap: true,
  checks: { pluginTimings: false },
  // package.json is the export map; tsdown must not rewrite it.
  exports: false,
});
