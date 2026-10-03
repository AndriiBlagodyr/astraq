import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "neutral",
  dts: true,
  sourcemap: true,
  checks: { pluginTimings: false },
  // package.json is the export map; tsdown must not rewrite it.
  exports: false,
});
