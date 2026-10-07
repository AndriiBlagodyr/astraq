# Veracand

Veracand is a learning-focused algorithmic trading and market analysis platform.

The project has two goals:

1. Grow fullstack depth across Next.js, Node.js, Python, Postgres, MongoDB, Redis, and infrastructure.
2. Become a genuinely useful personal app for watchlists, charting, paper trading, strategy testing, and later forecasting.

## Current status

- `apps/web` is the most developed app today and contains the current UI.
- `apps/api` is a NestJS service with structured logging, validated environment configuration, and health endpoints. Requests and responses are validated with Zod schemas from `packages/shared`, and its OpenAPI spec is committed in `apps/api/openapi.json`.
- `packages/sdk` is the typed API client generated from that spec. The web app's `/status` page calls the API through it.
- `packages/ui` contains the Tailwind-based semantic design system and Storybook catalog.
- `services/ml` is a FastAPI service managed with `uv` (Python 3.12, lockfile in `uv.lock`).
- The product plan and phased execution live in [ROADMAP.md](./ROADMAP.md).

## Repository structure

```text
astraq/
├── apps/
│   ├── web/         Next.js 16 frontend
│   └── api/         NestJS backend
├── services/
│   └── ml/          Python FastAPI service (uv)
├── packages/
│   ├── ui/          Shared tokens, accessible components, and Storybook
│   ├── shared/      Zod schemas shared by the apps (the contract's source)
│   └── sdk/         Typed API client generated from the OpenAPI spec
└── infra/
    └── docker/      Local Postgres + TimescaleDB and Redis (compose)
```

## Key documents

- [ROADMAP.md](./ROADMAP.md): product and engineering plan
- [AGENTS.md](./AGENTS.md): repository-wide architectural guardrails
- [apps/web/AGENTS.md](./apps/web/AGENTS.md): frontend conventions
- [apps/api/AGENTS.md](./apps/api/AGENTS.md): backend conventions
- [packages/shared/AGENTS.md](./packages/shared/AGENTS.md) and [packages/sdk/AGENTS.md](./packages/sdk/AGENTS.md): the API contract
- [services/ml/AGENTS.md](./services/ml/AGENTS.md): ML service conventions
- [docs/deploy.md](./docs/deploy.md): deploying web to Vercel and the api and TimescaleDB to Railway ([ADR 0005](./docs/decisions/0005-hosting-topology-and-timescale-availability.md))

## Running locally

Node workspaces use **pnpm**. The ML service uses **uv**, not Poetry or a manual `pip` + venv workflow.

If `pnpm` is not available yet, enable the Corepack shim once:

```bash
corepack enable
```

If `uv` is not available yet:

```bash
brew install uv                 # macOS
winget install astral-sh.uv     # Windows
```

### Root

```bash
pnpm install
pnpm infra:up
pnpm dev
```

`pnpm dev` starts web (`:3000`), api (`:4000`), and ml (`:8000`), and rebuilds `packages/ui` on change. It needs `uv` on `PATH` for the ML service. How Python fits into the pnpm + Turborepo setup is in [ADR 0003](./docs/decisions/0003-pnpm-turborepo-and-python-in-the-monorepo.md).

### Share a local session (ngrok)

Tunnel only the Next.js app. The API and ML service stay on localhost; the web server calls them as the BFF.

1. Install ngrok (`brew install ngrok`) and add your token once:

```bash
ngrok config add-authtoken <your-token>
```

2. With `pnpm dev` already running:

```bash
pnpm share
```

The public HTTPS URL is printed in the ngrok terminal (and at `http://127.0.0.1:4040`). Do not commit tokens. This is for personal demos, not production.

Storybook is a second process (`pnpm dev:storybook` on `:6006`). Tunnel it with `pnpm share:storybook`. Free ngrok is one hostname, so with Storybook already shared, `pnpm share` opens a second URL for the app (Cloudflare quick tunnel, or localtunnel if that is unavailable).

### Local infra

`pnpm infra:up` starts Postgres 16 + TimescaleDB (`localhost:5432`) and Redis 7 (`localhost:6379`) from `infra/docker/compose.yml`, and waits until both are healthy. It needs Docker running. The local database and user are both `veracand` (password `veracand`). To change a port or the credentials, copy `infra/docker/.env.example` to `infra/docker/.env`.

The api applies pending Prisma migrations (`prisma migrate deploy`) every time `pnpm dev` starts it. If the database is down it logs the error and starts anyway, and `/health/ready` reports 503. After editing `apps/api/prisma/schema.prisma`, run `pnpm db:migrate` to create and apply a new migration. `pnpm install` generates the Prisma Client into `apps/api/src/generated/`, which is gitignored; after editing the schema, `pnpm --filter @astraq/api db:generate` refreshes it.

If something else already listens on `5432` (a native Postgres install, for example), `infra:up` fails with "ports are not available". Set `POSTGRES_PORT=5433` in `infra/docker/.env`, and point the api at it with `DATABASE_URL=postgres://veracand:veracand@localhost:5433/veracand`.

`pnpm infra:down` stops the containers and keeps the data. To wipe it too, run `docker compose -f infra/docker/compose.yml down -v`.

### Environment variables

Every service validates its env at boot and exits with a readable error on a bad value. Outside production every variable has a default that matches `pnpm infra:up`, so local dev needs no `.env`. In production (`NODE_ENV=production` for api, `ENVIRONMENT=production` for ml) the infra URLs have no defaults and must be set. The api's `REDIS_URL` is the exception until a module uses Redis (Phase 3).

| Service | Variable | Local default |
|---|---|---|
| api | `PORT` | `4000` |
| api | `LOG_LEVEL` | `info` |
| api, ml | `DATABASE_URL` | `postgres://veracand:veracand@localhost:5432/veracand` |
| api, ml | `REDIS_URL` | `redis://localhost:6379` |
| api | `CORS_ORIGINS` | `http://localhost:3000` (comma-separated origins, no paths) |
| ml | `LOG_LEVEL` | `info` |
| web | `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| web | `API_URL` | `http://localhost:4000` |
| web | `ML_URL` | `http://localhost:8000` |

### Web

```bash
cd apps/web
pnpm install
pnpm dev
```

### Design system

```bash
pnpm dev:storybook
```

Storybook runs on `http://localhost:6006`.

### API

```bash
cd apps/api
pnpm install
pnpm dev
```

Swagger UI runs at `http://localhost:4000/api/docs` outside production.

#### Changing an endpoint

The contract runs from a Zod schema in `packages/shared`, to the Nest DTO and handler (`@ZodResponse`), to `apps/api/openapi.json`, to the generated `packages/sdk/src/schema.ts`. After changing any of the first two, run at the root:

```bash
pnpm contract
```

and commit both regenerated files. CI runs the same command and fails if they differ. See [ADR 0004](./docs/decisions/0004-nestjs-openapi-generated-sdk-contract.md).

### ML service

Python 3.12 is pinned in `services/ml/.python-version`. From the repo root or `services/ml`:

```bash
cd services/ml
uv sync --group dev
uv run uvicorn app.main:app --reload --port 8000
```

`pnpm dev` at the root runs the same command.

## Testing

Recommended libraries:

- Web unit tests: Vitest + Testing Library
- API unit tests: Vitest
- Web E2E tests: Playwright
- ML service tests: pytest + FastAPI TestClient

Common commands:

```bash
pnpm test:unit:web
pnpm test:unit:api
pnpm test:e2e:web
pnpm test:unit:ml
```

`pnpm test:unit:ml` runs `uv run --directory services/ml pytest`.

## Near-term priorities

- Phase 0: make CI required on `master` (everything else is done)
- Phase 1: walking skeleton — adjusted daily candles from provider to a deployed chart through the generated SDK (the contract pipeline — shared schemas, OpenAPI, SDK — is in place)
- see [ROADMAP.md](./ROADMAP.md) for the full phased plan
