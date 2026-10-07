# Deploying Veracand

Web on Vercel, the api and Postgres (TimescaleDB) on Railway. [ADR 0005](decisions/0005-hosting-topology-and-timescale-availability.md) explains why. This is the one-time setup, then what each deploy does.

## 1. Railway project

Create one Railway project (`veracand`) with two services, in the same region you'll pin Vercel to (e.g. US East).

### Postgres (`timescaledb`)

1. **New → Docker Image** → `timescale/timescaledb:2.17.2-pg16` (the same tag as `infra/docker/compose.yml`). Name the service `timescaledb`.
2. **Volume:** mount at `/var/lib/postgresql/data`.
3. **Variables:**

   | Variable | Value |
   |---|---|
   | `POSTGRES_USER` | `veracand` |
   | `POSTGRES_PASSWORD` | a long random string (Railway's *Generate*) |
   | `POSTGRES_DB` | `veracand` |
   | `PGDATA` | `/var/lib/postgresql/data/pgdata` (the volume root isn't empty) |

4. **Networking:** leave it private, no TCP proxy. The api reaches it at `timescaledb.railway.internal:5432`.

### API (`api`)

1. **New → GitHub Repo** → this repo. Leave the **Root Directory** empty: the image builds from the repo root.
2. **Settings → Config-as-code path:** `apps/api/railway.json`. It sets the Dockerfile, the watch paths, `prisma migrate deploy` as the pre-deploy step, and the `/health/ready` healthcheck.
3. **Variables:**

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `postgres://veracand:${{timescaledb.POSTGRES_PASSWORD}}@timescaledb.railway.internal:5432/veracand` |
   | `CORS_ORIGINS` | the Vercel production origin, e.g. `https://veracand.vercel.app` (no trailing slash) |
   | `LOG_LEVEL` | `info` |
   | `ALPACA_API_KEY_ID`, `ALPACA_API_SECRET_KEY` | Alpaca keys, marked **sealed**. Only the bootstrap reads them |

   `NODE_ENV=production` is baked into the image. Railway sets `PORT`.
4. **Networking → Generate Domain.** That URL is the web app's `API_URL`.

The first deploy builds the image, runs the migrations against the empty database (the `init` migration creates the `timescaledb` extension and the hypertable), and goes live once `/health/ready` returns 200.

### Load the candles

The database is private, so run the bootstrap inside the API container:

```sh
railway link            # pick the veracand project
railway ssh --service api
node dist/market-data/bootstrap/main            # the default ~20 tickers
node dist/market-data/bootstrap/main --tickers NVDA,AAPL
```

It's idempotent: run it again to backfill new bars.

## 2. Vercel project

1. **Add New → Project** → this repo. **Root Directory:** `apps/web`. Vercel detects pnpm and the workspace. `apps/web/vercel.json` builds through Turborepo, so `@astraq/ui` and `@astraq/sdk` build first.
2. **Settings → General → Node.js Version:** 24.x (matches `.nvmrc`).
3. **Settings → Functions → Region:** the one closest to Railway's region (e.g. `iad1` for US East).
4. **Environment variables** (Production and Preview):

   | Variable | Value |
   |---|---|
   | `API_URL` | the Railway API domain, e.g. `https://api-production-xxxx.up.railway.app` |
   | `NEXT_PUBLIC_APP_URL` | the Vercel production URL |

   Leave `ML_URL` unset: the ML service isn't deployed yet, and `/status` says so.

Every push to `master` deploys production. Every PR gets a preview URL that reads the production API.

## Each deploy, in order

| Step | Where | Fails how |
|---|---|---|
| Build the image | Railway | Build log. The previous deploy keeps serving |
| `prisma migrate deploy` | Railway pre-deploy, in the new image | Deploy marked failed. The previous deploy keeps serving |
| `/health/ready` returns 200 | Railway healthcheck | Deploy marked failed. The previous deploy keeps serving |
| `turbo run build --filter=web` | Vercel | Build log. The previous deploy keeps serving |

Migrations must stay backward compatible with the running api (expand, then contract): the pre-deploy step runs them while the old version is still serving.

## Check it

- `https://<api-domain>/health/ready` → `{"status":"ok"}`
- `https://<web-domain>/status` → API up (ML down until it deploys)
- `https://<web-domain>/stocks/NVDA` → the split-adjusted chart, on a phone too

## Build the api image locally

```sh
docker build -f apps/api/Dockerfile -t veracand-api .
docker run --rm -p 4000:4000 \
  -e DATABASE_URL=postgres://veracand:veracand@host.docker.internal:5432/veracand \
  -e CORS_ORIGINS=http://localhost:3000 \
  veracand-api
```
