import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Tests that need a real database (`*.int-spec.ts`). Run after
// `pnpm infra:up` and `pnpm db:deploy`; CI runs them against TimescaleDB,
// Redis, and MongoDB service containers.
export default defineConfig({
  test: {
    globals: true,
    root: './src',
    environment: 'node',
    include: ['**/*.int-spec.ts'],
    // One database, shared fixtures: no parallel files.
    fileParallelism: false,
  },
  plugins: [swc.vite()],
});
