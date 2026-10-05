import { defineConfig } from 'prisma/config';
import { LOCAL_DEFAULTS } from './src/common/local-defaults';

// Read by the Prisma CLI (generate, migrate). The running api validates
// DATABASE_URL in src/common/env.ts and hands it to the client itself.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DATABASE_URL ?? LOCAL_DEFAULTS.DATABASE_URL,
  },
});
