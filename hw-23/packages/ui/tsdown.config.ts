import { defineConfig } from "tsdown";

/*
 * Unbundled ESM: every source file becomes its own dist file. That keeps
 * each file's "use client" directive on the module that declared it (a
 * bundled chunk would hoist or drop it), and lets apps tree-shake per
 * component. The CSS is not bundled here; scripts/postbuild.ts writes it.
 */
export default defineConfig({
  entry: [
    "src/index.ts",
    "src/components/*/index.ts",
    "src/theme/index.ts",
    "src/motion/index.ts",
    "src/lib/cn.ts",
  ],
  format: "esm",
  platform: "neutral",
  unbundle: true,
  dts: true,
  sourcemap: true,
  checks: {
    // Rolldown warns that bundling may drop "use client". Unbundled, it
    // doesn't; every directive lands on its own file (checked in scripts/postbuild.ts).
    moduleLevelDirective: false,
    pluginTimings: false,
  },
  // package.json is the export map; tsdown must not rewrite it.
  exports: false,
  deps: {
    // react/jsx-runtime and every dependency stay imports, resolved by the app.
    neverBundle: true,
  },
  // Also runs after each rebuild in watch mode, so the CSS stays current.
  onSuccess: "tsx scripts/postbuild.ts",
});
