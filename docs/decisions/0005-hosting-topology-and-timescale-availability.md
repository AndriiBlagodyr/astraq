# ADR 0005: Hosting topology and Timescale availability

- Status: Accepted
- Date: 2026-10-06

## Context

Phase 1 ends with a deployed URL: adjusted candles for any bootstrapped ticker, opened from a phone. Three things have to run somewhere:

- `apps/web`, a Next.js 16 app. It's the BFF: only its server code calls the API.
- `apps/api`, a long-running NestJS process. It applies Prisma migrations and needs a private connection to Postgres.
- Postgres 16 **with TimescaleDB**. `candles_daily` is a hypertable, and later phases use compression policies and continuous aggregates. Those features are in the Timescale License (TSL) build only, not the Apache-2 build that some managed Postgres products ship.

`services/ml` has nothing to serve yet: its only endpoint is `/health`. Redis has no user until BullMQ arrives in Phase 3.

The constraints: one person, personal use (provider data isn't redistributed), a few dollars a month, and the same database locally, in CI, and in production. A migration that passes locally has to pass on deploy.

### Options considered

| Option | Verdict |
|---|---|
| **Vercel (web) + Railway (api from a Dockerfile, plus the `timescale/timescaledb` image on a Railway volume)** | **Chosen.** Same image and tag as `infra/docker/compose.yml` and the CI service container, so all three environments run identical Timescale. The full TSL build. The api reaches the database over Railway's private network, so the database never needs a public port. About $5 a month on the Hobby plan. |
| Vercel + Fly.io (api Machine + Timescale on a Fly volume) | Same parity, but more to run by hand: `fly.toml`, volume snapshots, and the database Machine's lifecycle. Nothing to learn here that Railway doesn't also teach. |
| Railway (api) + Timescale Cloud | Managed backups and point-in-time recovery, but paid after the trial (around $30+ a month): too much for a personal app with one user. Worth revisiting if the data becomes expensive to rebuild. |
| Neon, Supabase, RDS, and similar managed Postgres | Ship no Timescale or the Apache-2 build only (no compression, no continuous aggregates). Ruled out by Phase 4. |
| Everything on one VPS (compose) | Cheapest at scale, but we'd own TLS, deploys, and OS patching. Too much ops for Phase 1. |

## Decision

### 1. Web on Vercel

- Project root `apps/web`. `apps/web/vercel.json` builds through Turborepo (`turbo run build --filter=web`), so `@astraq/ui` and `@astraq/sdk` are built first.
- Git integration gives a preview deploy for every PR, as Phase 1 requires. Previews call the production API. They're read-only, and the API is the only writer.
- `API_URL` is the Railway API's public URL. `ML_URL` is left unset until the ML service deploys, so `/status` reports it as down. That's true.

### 2. API on Railway, from `apps/api/Dockerfile`

- Built from the repo root: a multi-stage image with a filtered `pnpm install`, a topological build (`@astraq/shared`, then the api), and `pnpm deploy --prod` into a self-contained runtime stage that runs as the `node` user.
- `prisma` is a runtime dependency, so `preDeployCommand: npx prisma migrate deploy` runs in the release image before traffic switches. A failed migration fails the deploy, and the previous version keeps serving.
- The healthcheck is `/health/ready`, which runs a real database query, so a deploy that can't reach Postgres never goes live.
- Config as code: `apps/api/railway.json` (builder, Dockerfile path, watch patterns, pre-deploy command, healthcheck).

### 3. Postgres on Railway, from the same Timescale image

- Image `timescale/timescaledb:2.17.2-pg16`, the same tag as compose and CI. A volume is mounted at `/var/lib/postgresql/data`, with `PGDATA` in a subdirectory, because the volume root isn't empty.
- No public TCP proxy. The api connects over the private network (`*.railway.internal`). Data is loaded with the bootstrap CLI from inside the API container (`railway ssh`), not from a laptop.
- Backups: Railway volume backups, plus the fact that every row can be rebuilt from Alpaca with the bootstrap CLI. Real backup and restore drills are Phase 10.

### 4. Production config is validated, not defaulted

The api already refuses to boot in production without `DATABASE_URL` and `CORS_ORIGINS`. `REDIS_URL` comes off that list until a module uses Redis, so the first deploy doesn't pay for an idle Redis. It goes back on in Phase 3 with BullMQ.

## Consequences

- One deploy runbook: [docs/deploy.md](../deploy.md).
- Upgrading Timescale or Postgres means changing three places together: compose, the CI service, and the Railway image. A Postgres major upgrade on Railway needs a dump and restore, not just a tag change.
- Vercel and Railway run in different regions unless they're pinned to match. Every page is a server-to-server call, so pin both near each other (e.g. Vercel `iad1`, Railway US East).
- Self-hosting the database means no point-in-time recovery. Acceptable while the data is a rebuildable cache of a provider.
- The `migrate deploy` in the api's `dev` script stays a local convenience. In production, migrations run only in the pre-deploy step.
