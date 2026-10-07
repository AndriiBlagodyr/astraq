# Production image for apps/api. Built from the repo root, because the api
# depends on workspace packages (@astraq/shared):
#
#   docker build -f apps/api/Dockerfile -t veracand-api .
#
# Railway builds it the same way (apps/api/railway.json). See ADR 0005.

# Same major as .nvmrc. Slim (glibc) rather than alpine: Prisma's schema
# engine, which `migrate deploy` runs, ships glibc builds first.
FROM node:24-slim AS base
# Prisma's engines link against OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS build
# pnpm at the version pinned in the root package.json (`packageManager`).
RUN corepack enable
WORKDIR /repo
COPY . .
# Only the api and the workspace packages it depends on. `postinstall` runs
# `prisma generate`, so the client exists before the build.
RUN pnpm install --frozen-lockfile --filter "@astraq/api..."
# Topological: @astraq/shared first, then the api.
RUN pnpm --filter "@astraq/api..." build
# A self-contained copy of the api with production dependencies only.
# Workspace packages are copied in as packed (their `files`), not linked.
# `dist` is gitignored, so pnpm's packlist leaves it out; copy it explicitly.
RUN pnpm --filter @astraq/api deploy --prod --legacy /out \
  && cp -r apps/api/dist /out/dist

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
# Railway sets PORT; 4000 is the local default (src/common/env.ts).
EXPOSE 4000
CMD ["node", "dist/main"]
