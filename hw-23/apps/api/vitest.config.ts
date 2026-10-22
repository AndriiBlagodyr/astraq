import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './src',
    environment: 'node',
    include: ['**/*.spec.ts', '**/*.test.ts'],
    // Specs that boot a Nest testing module spend seconds importing it; under
    // `turbo run lint typecheck test:unit` the default 10s can run out.
    hookTimeout: 30_000,
  },
  plugins: [swc.vite()],
});
