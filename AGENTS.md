# Astraq — Algorithmic Trading Platform

## Mission
Astraq is a learning-focused algorithmic trading and market analytics platform.
Goals the codebase must serve:
1. Deepen Fullstack skills (Node.js, Python, Next.js 16, Postgres, MongoDB).
2. Provide a real algo-trading & stock-analysis product (strategies, backtests, paper trading).
3. Deliver creative chart visualizations with historical + predictive data.

## Architecture
- `apps/web`  — Next.js 16 frontend (RSC-first). UI, charts, auth surface.
- `apps/api`  — NestJS domain API. Auth, portfolios, orders, market data orchestration.
- `services/ml` — Python FastAPI service + BullMQ workers, managed with `uv`. Owns backtesting, analytics, forecasting. Read-only on market data; never writes domain tables.
- `services/ingest` (Phase 9) — Python websocket ingestor -> Redis Streams.
- `packages/ui` — semantic design tokens and accessible, reusable React components.
- `packages/shared` (Phase 1) — Zod schemas + TS types; exports JSON Schema for Python (Pydantic) consumers.
- `packages/sdk` (Phase 1) — typed client generated from api OpenAPI (`openapi-typescript` + `openapi-fetch`).

## Data stores
- Postgres (+ TimescaleDB) — users, portfolios, orders, OHLCV hypertables.
- MongoDB (Phase 4) — raw provider payload archive, later news and research notes. Strategy definitions live in Postgres.
- Redis — cache, rate limits, BullMQ queues (Node and Python workers), streams.

## Non-negotiables
- All env vars validated with Zod (Node) / Pydantic Settings (Python) at boot.
- Every endpoint has: schema -> service -> repo -> tests -> OpenAPI doc.
- No secrets in repo; prefer `.env.local` and Doppler/SOPS in prod.
- Shared UI consumes semantic CSS variables and supports theme identity independently from light/dark mode.
- Trading-specific patterns and app shells stay in `apps/web`; do not move product behavior into `packages/ui`.
- Money is `numeric`/`Decimal`, never float. Timestamps are `timestamptz` UTC.
- Backtesting and paper trading share one fill model; there is exactly one backtest engine (Python).
- No placeholder routes: a web route exists only when it renders real data.
- Learning > shipping: when a simple library exists AND a teaching opportunity exists, prefer implementing one layer by hand first (e.g. JWT refresh rotation, event-driven backtester).

## Current phase
Track the phased plan in `ROADMAP.md`. Do not start a new phase until the previous phase's tests and docker infra are green.
