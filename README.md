# Astraq

Astraq is a learning-focused algorithmic trading and market analysis platform.

The project has two goals:

1. Grow fullstack depth across Next.js, Node.js, Python, Postgres, MongoDB, Redis, and infrastructure.
2. Become a genuinely useful personal app for watchlists, charting, paper trading, strategy testing, and later forecasting.

## Current status

- `apps/web` is the most developed app today and contains the current UI.
- `apps/api` is a NestJS service with structured logging, validated environment configuration, and health endpoints.
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
└── packages/
    └── ui/          Shared tokens, accessible components, and Storybook
```

## Key documents

- [ROADMAP.md](./ROADMAP.md): product and engineering plan
- [AGENTS.md](./AGENTS.md): repository-wide architectural guardrails
- [apps/web/AGENTS.md](./apps/web/AGENTS.md): frontend conventions
- [apps/api/AGENTS.md](./apps/api/AGENTS.md): backend conventions
- [services/ml/AGENTS.md](./services/ml/AGENTS.md): ML service conventions

## Running locally

Node workspaces use **pnpm**. The ML service uses **uv**, not Poetry or a manual `pip` + venv workflow.

If `pnpm` is not available yet, enable the Corepack shim once:

```bash
corepack enable
```

If `uv` is not available yet:

```bash
brew install uv
```

### Root

```bash
pnpm install
pnpm dev
```

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

### ML service

Python 3.12 is pinned in `services/ml/.python-version`. From the repo root or `services/ml`:

```bash
cd services/ml
uv sync --group dev
uv run uvicorn app.main:app --reload
```

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

- finish Phase 1: OpenAPI generation and a typed SDK consumed by `apps/web`
- add local Docker infra (Postgres + TimescaleDB) as a Phase 2 prerequisite
- ship the first useful personal-use flows: watchlists, candles, auth, and paper trading
