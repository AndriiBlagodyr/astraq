# Astraq Roadmap

Astraq should do two jobs at the same time:

1. Turn a frontend-heavy background into real fullstack depth across Node.js, Python, databases, and infrastructure.
2. Become a genuinely useful personal trading and market-analysis app, not just a sandbox of disconnected experiments.

This roadmap is optimized for both. It pushes a usable product earlier, keeps the architecture serious, and still leaves space for deeper learning later.

## Product North Star

The first meaningful Astraq release should let you:

- sign in securely
- search and track symbols
- view historical candles and indicators
- build watchlists
- run paper trades
- track portfolio and PnL
- define simple rule-based strategies
- backtest those strategies on historical data

If a phase does not improve one of those user outcomes or clearly deepen a core engineering skill, it should be questioned.

## Current scaffold

- `apps/web` — Next.js 16 + Mantine + React Query + `lightweight-charts` + Playwright + Vitest.
- `apps/api` — bare Express starter (`cors`, `dotenv`, `express`).
- `services/ml` — minimal FastAPI with `/health` and `/predict`.

## Target architecture

```text
astraq/
├── apps/
│   ├── web/     Next.js 16 frontend (App Router, RSC-first)
│   └── api/     NestJS domain API (auth, portfolios, orders, market data)
├── services/
│   ├── ml/      FastAPI analytics + forecasting + advanced backtests
│   └── ingest/  Python worker for streaming ingestion (added later)
├── packages/
│   ├── shared/  Zod schemas + shared TS types
│   └── sdk/     Typed client generated from OpenAPI
└── infra/
    ├── docker/  local infra and compose files
    └── k8s/     optional later
```

## Architectural decisions for this roadmap

- `apps/api` standardizes on **NestJS**. No more Fastify-or-NestJS branching in the main plan.
- The **API owns auth**. The web app consumes auth and can act as a BFF when needed, but Astraq does not maintain two first-class auth systems.
- **Postgres + TimescaleDB** is the source of truth for transactional and time-series data.
- **MongoDB** is used only where flexible document storage is genuinely valuable.
- **Redis** powers caching, rate limits, queues, and lightweight streaming patterns.
- **Python owns analytics and ML**, not core transactional flows.

This keeps the architecture realistic without turning the project into a framework comparison lab.

## Delivery guardrails

- Do not start a new phase until the prior phase is green enough to use and test.
- Prefer one clear implementation path over two competing patterns.
- Every user-facing API feature should include: schema, service, persistence, tests, OpenAPI update, and web integration.
- Infra or internal service work does not need forced Playwright coverage if there is no user flow to exercise.
- Keep ADRs in `docs/decisions/` for major choices like NestJS, TimescaleDB, MongoDB, streaming, or deployment.

---

## Phase 0 — Monorepo and developer foundation

**Goal:** create a stable workspace that can carry the rest of the project.

1. Move to **pnpm workspaces + Turborepo**.
2. Add `packages/shared` and `packages/sdk`.
3. Centralize linting, formatting, TS config, root scripts, and workspace conventions.
4. Add local infra in `infra/docker/`:
   - Postgres 16 + TimescaleDB
   - MongoDB 7
   - Redis 7
   - Mailhog
   - Adminer / Mongo Express
5. Add env validation at boot:
   - Zod in Node
   - `pydantic-settings` in Python
6. Add CI for lint, typecheck, and tests across `apps/*` and `services/*`.

**Learning focus:** workspaces, build tooling, module resolution, environment safety, reproducible local infra.

**Exit criteria:**
- one command boots local app + dependencies
- each service validates env and fails fast
- CI runs successfully on the monorepo

---

## Phase 1 — API foundation and contracts

**Goal:** turn `apps/api` into a real backend foundation.

1. Replace bare Express with **NestJS**.
2. Establish module boundaries:
   - controllers
   - services
   - repositories
   - common cross-cutting modules
3. Add structured logging with `pino`.
4. Add global exception handling and problem-style error responses.
5. Add `/health/live` and `/health/ready`.
6. Generate **OpenAPI** from the API and produce `packages/sdk`.
7. Make the web app consume the SDK instead of raw endpoint calls.

**Learning focus:** DI, module architecture, request lifecycle, OpenAPI, typed client generation, structured logging.

**Exit criteria:**
- NestJS app runs locally
- OpenAPI is generated
- web uses generated SDK for at least one real flow

---

## Phase 2 — Data model and personal-use MVP core

**Goal:** build the first actually useful Astraq core.

1. Add Prisma with Postgres.
2. Model the first core entities:
   - `User`
   - `Session`
   - `RefreshToken`
   - `Watchlist`
   - `WatchlistItem`
   - `Portfolio`
   - `Position`
   - `Order`
   - `Trade`
   - `AuditLog`
3. Add TimescaleDB for OHLCV candles.
4. Build the first market-data table structure for:
   - symbol metadata
   - candles by timeframe
5. Create initial user-facing flows:
   - symbol search
   - watchlist management
   - symbol details page
   - historical candles API
   - read-only portfolio skeleton

**Learning focus:** relational modeling, migrations, indexing, repository pattern, transactional thinking, time-series data basics.

**Exit criteria:**
- a signed-in user can view symbols, save watchlists, and see historical price charts
- core schema is migrated and seeded locally

---

## Phase 3 — Authentication and account security

**Goal:** add a serious auth system once the app already has value.

Primary implementation: **API-owned auth**.

1. Email/password registration and login.
2. Argon2id password hashing.
3. JWT access token + rotating opaque refresh token with reuse detection.
4. Email verification and password reset.
5. RBAC roles:
   - `user`
   - `pro`
   - `admin`
6. Optional but recommended in this phase:
   - TOTP 2FA
   - recovery codes
   - API keys for personal bots and scripts
7. Secure cookie and header defaults:
   - `HttpOnly`
   - `Secure`
   - `SameSite`
   - CORS allowlist
   - CSP in web middleware
   - rate limiting with Redis

**Not in the main path:** a second Auth.js implementation. If you still want that learning exercise, capture it as an ADR or a separate comparison spike later.

**Learning focus:** auth flows, token rotation, session security, authorization, abuse protection.

**Exit criteria:**
- a user can register, verify email, log in, refresh session, and reset password
- protected SDK-backed flows work end to end in the web app

---

## Phase 4 — Paper trading MVP

**Goal:** make Astraq useful for daily personal usage as early as possible.

1. Create paper trading flows:
   - place buy/sell orders
   - record fills
   - update positions
   - compute realized and unrealized PnL
2. Add portfolio screens:
   - holdings
   - cash balance
   - PnL summary
   - recent orders and trades
3. Add audit logging for order-related actions.
4. Add simple risk rules:
   - market closed handling
   - max order size
   - insufficient cash guard
5. Add seeded demo data so the feature is easy to use during development.

**Learning focus:** transactions, invariants, money-safe data handling, portfolio accounting, domain design.

**Exit criteria:**
- you can paper trade from the UI and see portfolio state update correctly
- order placement logic is covered by integration tests

---

## Phase 5 — Market data ingestion and reliability

**Goal:** feed the product with real market data in a maintainable way.

1. Integrate at least two historical providers to learn the adapter pattern.
   Suggested starting pair:
   - `yahoo-finance2` for easy historical equity data
   - Binance for free live-ish crypto experimentation
2. Define a `MarketDataProvider` contract.
3. Add BullMQ jobs for:
   - symbol backfill
   - refresh latest candles
   - retry and dead-letter handling
4. Add schedulers for end-of-day updates.
5. Store OHLCV in TimescaleDB hypertables with sane indexes.
6. Use Redis for hot quote caches and recently viewed symbols.

**MongoDB in this phase only if needed:** raw provider payloads or symbol/news metadata. Do not force Mongo usage just because it exists in the stack.

**Learning focus:** adapters, jobs, idempotency, retries, queue design, time-series storage, cache design.

**Exit criteria:**
- candles can be backfilled and refreshed automatically
- symbol pages read from your own stored data instead of ad hoc external calls

---

## Phase 6 — Charting and market analysis UX

**Goal:** turn Astraq into a tool you actually want to open.

1. Build a high-quality symbol page with:
   - candles
   - volume
   - EMA / SMA overlays
   - Bollinger bands
   - crosshair sync
2. Add market analysis views:
   - watchlist performance table
   - relative performance comparison
   - drawdown chart
   - returns distribution
   - seasonality heatmap
3. Add saved chart layouts.
4. Add streaming updates where they materially improve the UX.
5. Keep `lightweight-charts` as the primary OHLCV engine and use `d3` only for genuinely custom visuals.

**Learning focus:** RSC vs client boundaries, chart rendering, visualization design, performance, progressive hydration.

**Exit criteria:**
- the app feels like a legitimate market dashboard, not a scaffold
- core chart pages work well on desktop and mobile

---

## Phase 7 — Strategy engine and backtesting v1

**Goal:** move from passive analysis into active decision support.

1. Define a simple strategy DSL in TypeScript with Zod validation.
2. Support first rule-based strategies such as:
   - SMA crossover
   - RSI threshold
   - breakout
3. Build a backtest engine with:
   - entry and exit rules
   - commissions
   - slippage
   - equity curve output
   - trade log output
4. Let users save strategy definitions and run backtests from the UI.
5. Add summary metrics:
   - total return
   - Sharpe
   - max drawdown
   - win rate

At this point Astraq becomes very strong for personal use even before heavy ML.

**Learning focus:** event-driven thinking, domain modeling, evaluation pipelines, result visualization, trading-system ergonomics.

**Exit criteria:**
- you can define a strategy, run a backtest, and inspect results in the UI

---

## Phase 8 — Python analytics and ML service

**Goal:** expand Astraq from rule-based tooling into advanced research.

1. Upgrade `services/ml` structure:
   - `app/api/`
   - `app/core/`
   - `app/data/`
   - `app/features/`
   - `app/models/`
   - `app/backtest/`
   - `app/services/`
2. Adopt:
   - `uv`
   - `ruff`
   - `mypy`
   - `pytest`
3. Implement feature engineering:
   - returns
   - rolling volatility
   - RSI
   - MACD
   - ATR
   - OBV
4. Add statistical and classical ML models first:
   - ARIMA / SARIMA
   - GARCH
   - gradient boosting for directional prediction
5. Only then explore deeper models:
   - LSTM
   - TCN
   - N-BEATS
6. Add APIs for:
   - forecast bands
   - signal generation
   - advanced backtests
7. Add experiment tracking with MLflow if model work becomes active enough to justify it.

**Important:** do not let ML block the core app. ML should upgrade Astraq, not delay usefulness.

**Learning focus:** Python project structure, feature pipelines, time-series evaluation, model serving, experiment hygiene.

**Exit criteria:**
- forecasts or signals can be requested from the main app and displayed meaningfully
- at least one model path is evaluated with time-series-safe validation

---

## Phase 9 — Realtime execution loop and automation

**Goal:** make Astraq feel alive and operational.

1. Add strategy execution against streaming or periodic data.
2. Support alerts via:
   - email
   - in-app notifications
   - optional Telegram
3. Add lightweight live updates for:
   - portfolio PnL
   - latest candles
   - triggered strategy conditions
4. Introduce `services/ingest` only when polling and scheduled refreshes are no longer enough.
5. Use Redis Streams first unless a stronger reason appears for NATS.

**Learning focus:** streaming trade-offs, background processing, event-driven updates, operational safety.

**Exit criteria:**
- Astraq can monitor market conditions and surface actionable updates without manual refresh

---

## Phase 10 — Observability, testing, and performance

**Goal:** make the platform trustworthy.

1. Add OpenTelemetry across web, API, and ML.
2. Add Prometheus + Grafana dashboards.
3. Expand the testing pyramid:
   - unit tests
   - integration tests with real infra
   - contract tests for the SDK
   - Playwright for core user journeys
4. Add load testing for hot endpoints.
5. Add profiling and query analysis for slow DB paths.

**Learning focus:** production debugging, tracing, metrics, performance tuning, confidence at scale.

**Exit criteria:**
- failures are observable
- critical flows are covered by repeatable automated tests

---

## Phase 11 — Deployment and operations

**Goal:** deploy the app simply first, then grow operational maturity.

1. Add Dockerfiles for `web`, `api`, and `ml`.
2. Add production compose and environment templates.
3. Deploy the cheapest sensible path first:
   - Vercel for web
   - Railway or Fly.io for API and ML
   - managed Postgres / Redis / Mongo if needed
4. Add secrets management with Doppler or SOPS.
5. Explore Kubernetes only after the app is already useful and deployed.

**Learning focus:** deployment workflows, secrets handling, containerization, production readiness.

**Exit criteria:**
- Astraq is accessible outside local development
- deploys are repeatable and documented

---

## Stretch phase ideas

Only pick these after the core product is already good.

- advanced order simulator with partial fills and latency modeling
- factor dashboards and portfolio exposure analytics
- options support
- LLM research assistant over transcripts and notes
- GraphQL gateway for comparison with REST + SDK
- gRPC between API and ML
- event sourcing for portfolio and order history
- paid tiers and quotas

---

## Recommended execution summary

1. Build the workspace and backend foundation.
2. Ship a useful personal product fast: watchlists, charts, auth, paper trading.
3. Add ingestion reliability and strong chart UX.
4. Add strategy authoring and backtesting.
5. Layer in ML only after the core product loop is already valuable.
6. Finish with realtime, observability, and deployment maturity.

That order gives you earlier wins, better retention of new backend concepts, and a much higher chance that Astraq becomes something you genuinely use.
