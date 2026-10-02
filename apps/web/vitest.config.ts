import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["lib/**/*.{test,spec}.{ts,tsx}", "app/**/*.{test,spec}.{ts,tsx}", "test/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    // Phase 0 deleted the placeholder routes and their helpers' tests; unit
    // tests return with the first real logic in Phase 1.
    passWithNoTests: true,
  },
});
