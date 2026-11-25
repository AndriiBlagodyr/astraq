# Deploying Veracand

Web on Vercel, the api and Postgres (TimescaleDB) on Railway. [ADR 0005](decisions/0005-hosting-topology-and-timescale-availability.md) explains why. This is the one-time setup, then what each deploy does.

## 1. Railway project

Create one Railway project (`veracand`) with four services, in the same region you'll pin Vercel to (e.g. US East): Postgres, Redis, the api, and the worker that keeps market data fresh.

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

The migrations add two jobs that TimescaleDB runs by itself in this container, with no service of their own: daily compression of the bars older than 90 days, and an hourly refresh of the weekly bars. They need the image's default background workers, so don't set `timescaledb.max_background_workers` to 0. `SELECT * FROM timescaledb_information.job_stats` shows each job's last run.

### Redis (`redis`)

**New → Database → Redis.** Name the service `redis` and leave it private. It holds the api's rate-limit counters and the market data job queue, so it needs its volume: the schedule of the next refresh is a delayed job in it.

It also holds the cache of latest closes and symbol searches (`cache:*`). Leave `maxmemory-policy` at `noeviction`, Redis's default: the queue must never lose a job to make room. The cache doesn't need eviction, every key of it expires within the hour.

### API (`api`)

1. **New → GitHub Repo** → this repo. Leave the **Root Directory** empty: the image builds from the repo root.
2. **Settings → Config-as-code path:** `apps/api/railway.json`. It sets the Dockerfile, the watch paths, `prisma migrate deploy` as the pre-deploy step, and the `/health/ready` healthcheck.
3. **Variables:**

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `postgres://veracand:${{timescaledb.POSTGRES_PASSWORD}}@timescaledb.railway.internal:5432/veracand` |
   | `REDIS_URL` | `${{redis.REDIS_URL}}` |
   | `JWT_SECRET` | a long random string, marked **sealed**. The api refuses to start in production without it |
   | `CORS_ORIGINS` | the Vercel production origin, e.g. `https://veracand.vercel.app` (no trailing slash) |
   | `LOG_LEVEL` | `info` |
   | `BFF_SHARED_SECRET` | a long random string (32 characters or more), marked **sealed**; the same value goes to Vercel. With it the api rate-limits per browser. Without it every user shares the web server's bucket: ten failed sign-ins by anyone block sign-in for all |
   | `ALPACA_API_KEY_ID`, `ALPACA_API_SECRET_KEY` | Alpaca keys, marked **sealed**. The loaders need them; the api uses them to load a newly watched symbol's candles |
   | `ADMIN_EMAILS` | your own email, the one you register with. Those users see the job queue at `/admin/queue` and on `/status`. Unset: nobody does |
   | `MONGODB_URL` | optional, see [MongoDB](#mongodb-mongo-optional). Unset: no raw payload archive, everything else works |

   `NODE_ENV=production` is baked into the image. Railway sets `PORT`, and `RAILWAY_GIT_COMMIT_SHA`, which `/health` reports as `version`.
4. **Networking → Generate Domain.** That URL is the web app's `API_URL`.

The first deploy builds the image, runs the migrations against the empty database (the `init` migration creates the `timescaledb` extension and the hypertable), and goes live once `/health/ready` returns 200.

### MongoDB (`mongo`), optional

The archive of raw provider answers ([ADR 0011](decisions/0011-mongodb-vs-jsonb-for-the-raw-payload-archive.md)). Nothing depends on it: leave it out of the first deploy and add it when you want to replay what a provider sent.

1. **New → Database → MongoDB.** Name the service `mongo` and leave it private.
2. On the `api` service set `MONGODB_URL` to its private URL with a database name as the path, e.g. `${{mongo.MONGO_URL}}/veracand?authSource=admin`. The worker references the api's variables, so it gets it too; the worker is the one that writes.
3. `RAW_ARCHIVE_DAYS` (default 90) is how long an answer is kept. MongoDB deletes expired ones by itself (a TTL index the api creates on its first write).

No backup is planned for it: it holds copies of what the providers can be asked again, and it expires.

### Worker (`worker`)

The same image as the api, started as the market data worker: it takes jobs off the queue in Redis and schedules the refresh after every close (`apps/api/src/market-data/jobs/session-scheduler.ts`). A service of its own so a long backfill can't slow a request and the two restart independently.

1. **New → GitHub Repo** → this repo again, Root Directory empty. Name the service `worker`.
2. **Settings → Config-as-code path:** `apps/api/railway.worker.json`. It sets the same Dockerfile and watch paths, and `node dist/market-data/jobs/worker.main` as the start command. No healthcheck and no domain: the worker serves no HTTP.
3. **Variables:** the api's, all of them (the worker validates the same environment at start). The simplest way is a reference per variable, e.g. `DATABASE_URL` = `${{api.DATABASE_URL}}`. It needs the Alpaca keys: without a provider it exits at start.

It runs no migrations: the api's pre-deploy step does. Deployed together after a migration, the worker may start a moment before the new table exists; a job that fails on that is retried.

When it starts it logs the two sessions it made sure are scheduled, the last one that closed and the next to close. From then on each close schedules the next. Nothing else is needed: no cron entry, no timer. The queue is at `/admin/queue` in the web app for the users in `ADMIN_EMAILS`. From a shell:

```sh
railway ssh --service worker
node dist/market-data/jobs/main status      # jobs in each state
node dist/market-data/jobs/main dead        # the ones given up on, and why
node dist/market-data/jobs/main retry-dead  # put those back
```

### Load the symbols and candles

The database is private, so run the loaders inside the API container:

```sh
railway link            # pick the veracand project
railway ssh --service api
node dist/market-data/universe/main             # every listed US equity into `symbols`
node dist/market-data/bootstrap/main            # candles for the default ~20 tickers
node dist/market-data/bootstrap/main --tickers NVDA,AAPL
node dist/market-data/calendar/main             # the exchange calendar, 2016 to the end of next year
```

All three are idempotent: rerun the first to pick up listings and delistings, the second to backfill new bars, the third after a closure is announced. Any other symbol gets its candles the first time someone adds it to a watchlist, and the api reloads the year ahead of the calendar by itself when it runs short, so the third is for the history. Run it once all the same: the data quality check for missing sessions compares the bars against the stored calendar, and only as far back as it is stored.

After that the worker keeps every symbol that has bars fresh: half an hour after each close it loads the day's bars and the last three months of corporate actions, then checks what is stored. `/status` shows the result.

## 2. Vercel project

1. **Add New → Project** → this repo. **Root Directory:** `apps/web`. Vercel detects pnpm and the workspace. `apps/web/vercel.json` builds through Turborepo, so `@astraq/ui` and `@astraq/sdk` build first.
2. **Settings → General → Node.js Version:** 24.x (matches `.nvmrc`).
3. **Settings → Functions → Region:** the one closest to Railway's region (e.g. `iad1` for US East).
4. **Environment variables** (Production and Preview):

   | Variable | Value |
   |---|---|
   | `API_URL` | the Railway API domain, e.g. `https://api-production-xxxx.up.railway.app` |
   | `NEXT_PUBLIC_APP_URL` | the Vercel production URL |
   | `BFF_SHARED_SECRET` | the same value as on the api, marked **Sensitive** |

   Every page needs a session (`apps/web/proxy.ts` sends visitors to `/login`), and registration is invite-only through the api's `INVITE_EMAILS`, so provider data never sits on a public URL ([ui-plan § Decisions](ui-plan.md#decisions)). The Phase 1 `SITE_PASSWORD` gate is gone.

   Leave `ML_URL` unset: the ML service isn't deployed yet, and `/status` lists it as not deployed (unset in production means "not part of this deploy", not an outage). Keep **Settings → Environment Variables → Automatically expose System Environment Variables** on: `/status` shows the web build's `VERCEL_GIT_COMMIT_SHA`.

Every push to `master` deploys production. Every PR gets a preview URL that reads the production API.

## Each deploy, in order

| Step | Where | Fails how |
|---|---|---|
| Build the image | Railway | Build log. The previous deploy keeps serving |
| `prisma migrate deploy` | Railway pre-deploy, in the new image | Deploy marked failed. The previous deploy keeps serving |
| `/health/ready` returns 200 | Railway healthcheck | Deploy marked failed. The previous deploy keeps serving |
| The worker restarts on the new image | Railway, the `worker` service | It exits at start (no provider, a bad variable) and Railway restarts it: the deploy log shows the reason. Jobs wait in Redis meanwhile |
| `turbo run build --filter=web` | Vercel | Build log. The previous deploy keeps serving |

Migrations must stay backward compatible with the running api (expand, then contract): the pre-deploy step runs them while the old version is still serving.

## Check it

- `https://<api-domain>/health/ready` → `{"status":"ok","version":"<commit>"}`
- `https://<web-domain>/` → the browser asks for the site password
- `https://<web-domain>/status` → "All services up": API up with the same commit as `master`, the web version beside it, ML not deployed
- `https://<web-domain>/status`, the morning after a trading day → under "Market data", a check of last night's session with every check passed (missing sessions says "Not checked" until the calendar is loaded)
- `https://<web-domain>/robots.txt` → `Disallow: /`, served without the password
- `https://<web-domain>/stocks/NVDA` → the split-adjusted chart, on a phone too

## Build the api image locally

```sh
docker build -f apps/api/Dockerfile -t veracand-api .
docker run --rm -p 4000:4000 \
  -e DATABASE_URL=postgres://veracand:veracand@host.docker.internal:5432/veracand \
  -e CORS_ORIGINS=http://localhost:3000 \
  -e COMMIT_SHA="$(git rev-parse HEAD)" \
  veracand-api
```
