# Astraq — Algorithmic Trading Platform

## Mission
Astraq is a learning-focused algorithmic trading and market analytics platform.
Goals the codebase must serve:
1. Deepen Fullstack skills (Node.js, Python, Next.js 16, Postgres, MongoDB).
2. Provide a real algo-trading & stock-analysis product (strategies, backtests, paper trading).
3. Deliver creative chart visualizations with historical + predictive data.

## Architecture
- `apps/web`  — Next.js 16 frontend (RSC-first). UI, charts, auth surface.
- `apps/api`  — Node.js domain API (NestJS target). Auth, portfolios, orders, market data orchestration.
- `services/ml` — Python FastAPI service. Forecasting, backtesting, signal generation.
- `services/ingest` (planned) — Python websocket ingestor -> Redis/NATS streams.
- `packages/shared` (planned) — Zod schemas + TS types shared across web and api.
- `packages/sdk` (planned) — typed client generated from api OpenAPI.

## Data stores
- Postgres (+ TimescaleDB) — users, portfolios, orders, OHLCV hypertables.
- MongoDB — flexible documents: news, transcripts, strategy JSON, raw provider payloads.
- Redis — cache, rate limits, BullMQ queues, streams.

## Non-negotiables
- All env vars validated with Zod (Node) / Pydantic Settings (Python) at boot.
- Every endpoint has: schema -> service -> repo -> tests -> OpenAPI doc.
- No secrets in repo; prefer `.env.local` and Doppler/SOPS in prod.
- Learning > shipping: when a simple library exists AND a teaching opportunity exists, prefer implementing one layer by hand first (e.g. JWT refresh rotation, event-driven backtester).

## Current phase
Track the phased plan in `ROADMAP.md`. Do not start a new phase until the previous phase's tests and docker infra are green.
