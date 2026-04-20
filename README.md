# Astraq

Astraq is a learning-focused algorithmic trading and market analysis platform.

The project has two goals:

1. Grow fullstack depth across Next.js, Node.js, Python, Postgres, MongoDB, Redis, and infrastructure.
2. Become a genuinely useful personal app for watchlists, charting, paper trading, strategy testing, and later forecasting.

## Current status

- `apps/web` is the most developed app today and contains the current UI.
- `apps/api` is still a lightweight Express starter and is planned to move to NestJS.
- `services/ml` is a minimal FastAPI service that will grow into the analytics and ML layer.
- The product plan and phased execution live in [ROADMAP.md](./ROADMAP.md).

## Repository structure

```text
astraq/
├── apps/
│   ├── web/         Next.js 16 frontend
│   └── api/         Node.js backend
├── services/
│   └── ml/          Python FastAPI service
└── packages/        Shared packages to be added during roadmap execution
```

## Key documents

- [ROADMAP.md](./ROADMAP.md): product and engineering plan
- [AGENTS.md](./AGENTS.md): repository-wide architectural guardrails
- [apps/web/AGENTS.md](./apps/web/AGENTS.md): frontend conventions
- [apps/api/AGENTS.md](./apps/api/AGENTS.md): backend conventions
- [services/ml/AGENTS.md](./services/ml/AGENTS.md): ML service conventions

## Running locally

Current commands reflect the repository after the package-manager migration to `pnpm`.

If `pnpm` is not available on your machine yet, enable the Corepack shim once:

```bash
corepack enable
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

### API

```bash
cd apps/api
pnpm install
pnpm dev
```

### ML service

```bash
cd services/ml
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload
```

## Near-term priorities

- stabilize the workspace and local infrastructure
- migrate the API foundation to NestJS
- add shared contracts and generated SDK usage
- ship the first useful personal-use flows: watchlists, candles, auth, and paper trading
