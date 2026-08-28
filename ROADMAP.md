# Astraq Roadmap

> **Status (2026-08-28)** — Phase 1 in progress: API foundation and contracts.
> **Just shipped:** NestJS API skeleton, structured logging, health endpoints, and `uv` for `services/ml`.
> **Next milestone:** OpenAPI generation + the first generated SDK flow consumed by `apps/web`.
> **Known foundation gaps:** Turborepo, `packages/*`, CI, and local Docker infrastructure.

Astraq has two jobs at the same time:

1. Turn a frontend-heavy background into real fullstack depth across Node.js, Python, databases, and infrastructure.
2. Become a genuinely useful personal trading and market-analysis app — not a sandbox of disconnected experiments.

This roadmap optimizes for both. It pushes a usable product earlier, keeps the architecture serious, and leaves space for deeper learning later. It is a living plan, not a contract — review it at the start of every phase.

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

If a phase doesn't move one of those user outcomes forward or clearly deepen a core engineering skill, question it.

## Architecture at a glance

`AGENTS.md` is the source of truth for the tech baseline. The roadmap adds these locked-in decisions on top:

- `apps/api` standardizes on **NestJS**. The API owns auth; the web app is a BFF, never a second auth system.
- **Postgres + TimescaleDB** is the source of truth for transactional and time-series data.
- **MongoDB** enters in **Phase 6** for news, transcripts, and raw provider payloads — and only there. It does not get added "just in case".
- **Redis** powers caching, rate limits, BullMQ queues, and lightweight streams.
- **Python owns analytics and ML.** `services/ml` is packaged with **uv** (lockfile + `.python-version`). It does not own transactional flows. Do not reintroduce Poetry or ad-hoc `pip install` workflows.
- **`lightweight-charts` is the OHLCV engine.** `d3` is reserved for bespoke visuals — heatmaps, distributions, seasonality views.
- **`services/ingest` is built in Phase 9**, only when polling and scheduled refreshes are no longer enough.

```text
astraq/
├── apps/
│   ├── web/     Next.js 16 frontend (App Router, RSC-first)
│   └── api/     NestJS domain API (auth, portfolios, orders, market data)
├── services/
│   ├── ml/      FastAPI analytics, forecasting, advanced backtests (uv, Python 3.12)
│   └── ingest/  Python streaming ingestor (Phase 9)
├── packages/
│   ├── shared/  Zod schemas + shared TS types (planned)
│   └── sdk/     Typed client generated from API OpenAPI (planned)
└── infra/
    ├── docker/  local infra and compose files
    └── k8s/     optional, post-deployment
```

## Cross-cutting principles

These apply to every phase. Don't restate them inside phase descriptions.

- **Testing.** Follow [.cursor/rules/testing-strategy.mdc](./.cursor/rules/testing-strategy.mdc). The pyramid is: unit → integration with real infra → contract tests for the SDK → Playwright for core user journeys. Add load tests where they earn it.
- **Secrets and security.** Follow [.cursor/rules/security-and-secrets.mdc](./.cursor/rules/security-and-secrets.mdc). Env validation crashes startup if missing. No secrets in repo. Fail-closed defaults for auth, CORS, permissions.
- **ADR cadence.** Every phase ships at least one decision record in `docs/decisions/`. The exit criteria below assume this.
- **`packages/shared` versioning.** Internal-only, tracked with Changesets, no public semver until extracted from the monorepo.
- **Data licensing.** Providers like `yahoo-finance2` and Binance are for personal and learning use. No redistribution, no public dashboards exposing raw vendor data.
- **Observability is not a phase.** Structured logging starts in Phase 1. Tracing starts in Phase 4 (paper trading needs it). Phase 10 is for metrics, dashboards, and load testing — not for inventing observability from scratch.

## Delivery guardrails

- Do not start a new phase until the prior phase exits green.
- Each phase ships **code, tests, an ADR or doc page, and a product check.**
- A **product check** is a lightweight UX outcome — for example, "I opened Astraq three days last week without being prompted to," or "I placed five paper trades from my phone."
- Each phase has a **kill/pivot trigger.** If a phase blows past its trigger without a working slice, descope before pushing further.
- Prefer one clear implementation path over two competing patterns. Capture the alternative as an ADR if you want the comparison.
- User-facing API features always include: schema → service → repository → tests → OpenAPI update → web integration.
- Internal infra work doesn't need forced Playwright coverage if there's no user flow to exercise.

## Current scaffold (August 2026)

- `apps/web` — Next.js 16 + Mantine + React Query + `lightweight-charts` + Playwright + Vitest.
- `apps/api` — NestJS + TypeScript + Pino + Zod environment validation.
- `services/ml` — FastAPI with `/health` and `/predict`, managed by `uv` (Python 3.12 pin in `.python-version`, lockfile in `uv.lock`).
- The workspace currently includes `apps/*` only; `packages/*`, Turborepo, and `infra/docker` remain to be added.

---

## Phase 0 — Monorepo and developer foundation [done]

**Goal:** create a stable workspace that can carry the rest of the project.

1. Move to **pnpm workspaces + Turborepo**. **pnpm workspaces are in place; Turborepo is still deferred.**
2. Add `packages/shared` and `packages/sdk` (still deferred).
3. Centralize linting, formatting, TS config, root scripts, and workspace conventions.
4. Add local infra in `infra/docker/` (deferred until it becomes a Phase 2 prerequisite):
   - Postgres 16 + TimescaleDB
   - MongoDB 7 (image only — first use is Phase 6)
   - Redis 7
   - Mailhog
   - Adminer / Mongo Express
5. Add env validation at boot (Zod in Node, `pydantic-settings` in Python).
6. Add CI for lint, typecheck, and tests across `apps/*` and `services/*`.
7. Add **dependency automation** (Renovate or Dependabot) and a release-tagging convention.

**Learning focus:** workspaces, build tooling, module resolution, environment safety, reproducible local infra.

**Exit criteria:**

- one command boots local app + dependencies
- each service validates env and fails fast
- CI runs successfully on the monorepo
- ADR: "Why pnpm + Turborepo over Nx / Yarn workspaces"

**Kill/pivot trigger:** if local boot still requires manual setup steps after a week of polish, freeze the workspace work and accept the rough edges — they're not the point.

---

## Phase 1 — API foundation and contracts [in progress]

**Goal:** turn `apps/api` into a real backend foundation that the web app can rely on.

1. Replace bare Express with **NestJS**. **Done** (skeleton, logging, health, exception handling). Remaining Phase 1 work is OpenAPI and the SDK.
2. Establish module boundaries: controllers, services, repositories, common cross-cutting modules.
3. Add structured logging with `pino` and request-id propagation.
4. Add global exception handling and problem-style error responses.
5. Add `/health/live` and `/health/ready`.
6. Generate **OpenAPI** from the API and produce `packages/sdk` (typed client).
7. Make the web app consume the SDK for at least one real flow (today's predictions or market-data view).
8. Add **preview deploys** for the web app on PRs.

**Learning focus:** DI, module architecture, request lifecycle, OpenAPI, typed-client generation, structured logging.

**Exit criteria:**

- NestJS app runs locally and in CI
- OpenAPI is generated and committed
- web uses the generated SDK for at least one real flow
- ADR: "Why NestJS over Fastify-only or staying on Express"

**Kill/pivot trigger:** if NestJS DI ergonomics are blocking shipping after two weeks, fall back to Fastify with a hand-rolled module pattern and capture the reasons in the ADR.

---

## Phase 2 — Data model, MVP core, and basic charts

**Goal:** build the first actually useful Astraq core — even if behind a placeholder login.

This is where the product becomes real. To get there without faking three phases of data, Phase 2 explicitly includes a **dev auth shim** and a **single-provider candle bootstrap**. Both are replaced later in dedicated phases — the goal here is the user-visible loop, not production hardening.

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
3. Add TimescaleDB hypertables for OHLCV candles, with sane indexes.
4. **Dev auth shim:** email + password sign-in only, single role, plain JWT, no refresh rotation. Clearly marked as temporary in code and docs.
5. **Candle bootstrap script:** a single synchronous CLI that pulls historical candles from `yahoo-finance2` for a hardcoded symbol list and writes them into TimescaleDB. No queues, no retries, no abstraction yet.
6. Build the first user-facing flows:
   - symbol search
   - watchlist management
   - symbol details page with a **basic candle pane** (lightweight-charts, no overlays)
   - historical candles API
   - read-only portfolio skeleton

**Learning focus:** relational modeling, migrations, indexing, repository pattern, transactional thinking, time-series basics, RSC vs client boundaries for charts.

**Exit criteria:**

- a (shim-)signed-in user can view symbols, save watchlists, and see a real historical candle chart
- core schema is migrated and seeded locally
- bootstrap script runs cleanly against a fresh database
- ADR: "Auth shim contract — what it does, what it doesn't, what replaces it"
- product check: I can sit down and look at one of my watchlists' candles without external tools

**Kill/pivot trigger:** if the bootstrap script keeps growing features (caching, retries, symbol metadata, multi-provider), stop — those belong to Phase 5. Lock the script at "fetches one symbol's daily candles into one table".

---

## Phase 3 — Production auth and account security

**Goal:** replace the Phase 2 shim with a real auth system, now that the app already has value worth protecting.

The web app already has flows that use the shim — Phase 3 is migration plus hardening, not greenfield design.

1. Email/password registration and login with **Argon2id** hashing.
2. **JWT access token + rotating opaque refresh token with reuse detection.**
3. Email verification and password reset (Mailhog locally).
4. RBAC roles: `user`, `pro`, `admin`.
5. Optional but recommended in this phase:
   - TOTP 2FA
   - recovery codes
   - API keys for personal bots and scripts
6. Secure cookie and header defaults: `HttpOnly`, `Secure`, `SameSite`, CORS allowlist, CSP in web middleware, Redis-backed rate limiting.
7. Migrate the web app off the shim and delete the shim code in the same PR.

**Not in the main path:** a second Auth.js implementation. If you still want that learning exercise, capture it as an ADR or a separate spike.

**Learning focus:** auth flows, token rotation, session security, authorization, abuse protection.

**Exit criteria:**

- a user can register, verify email, log in, refresh session, and reset password
- protected SDK-backed flows work end to end
- the shim no longer exists in the codebase
- ADR: "Refresh-token rotation and reuse-detection design"
- product check: I trust the app enough to leave it logged in on my phone

**Kill/pivot trigger:** if reuse detection and email flows are still flaky after a week, ship without 2FA/API keys and put them in a follow-up phase. Auth core is non-negotiable; advanced features are.

---

## Phase 4 — Paper trading MVP and request tracing

**Goal:** make Astraq useful for daily personal usage and add the minimum tracing needed to debug money-handling code.

1. Paper trading flows:
   - place buy/sell orders
   - record fills
   - update positions
   - compute realized and unrealized PnL
2. Portfolio screens: holdings, cash balance, PnL summary, recent orders and trades.
3. Audit logging for order-related actions.
4. Simple risk rules: market-closed handling, max order size, insufficient cash guard.
5. Seeded demo data so the feature is easy to use during development.
6. **Minimal OpenTelemetry tracing** in `apps/api`: request-id propagation, span around each order placement, console exporter (or a local Jaeger if it's free). No metrics, no Prometheus yet — those are Phase 10.

**Learning focus:** transactions, invariants, money-safe data handling, portfolio accounting, domain design, instrumentation.

**Exit criteria:**

- you can paper trade from the UI and see portfolio state update correctly
- order placement is covered by integration tests against a real Postgres
- every order has a traceable request id from web → api → database
- ADR: "Order placement transaction boundaries and idempotency keys"
- product check: I placed at least five paper trades this week without thinking about the plumbing

**Kill/pivot trigger:** if PnL math keeps drifting between sessions, stop adding features and write a property-based test for the accounting before continuing.

---

## Phase 5 — Market data infrastructure

**Goal:** replace Phase 2's bootstrap script with real ingestion that you can lean on.

1. Define a `MarketDataProvider` contract.
2. Integrate at least two historical providers to learn the adapter pattern. Suggested starting pair:
   - `yahoo-finance2` for easy historical equity data (already used by the bootstrap)
   - Binance for free live-ish crypto experimentation
3. BullMQ jobs for:
   - symbol backfill
   - refresh latest candles
   - retry and dead-letter handling
4. Schedulers for end-of-day updates.
5. Promote the bootstrap script's data path into proper hypertable maintenance — partitions, compression policies, retention.
6. Use Redis for hot quote caches and recently viewed symbols.

**Mongo is still not introduced here.** It enters in Phase 6.

**Learning focus:** adapters, jobs, idempotency, retries, queue design, time-series storage, cache design.

**Exit criteria:**

- candles can be backfilled and refreshed automatically
- symbol pages read from your own stored data instead of ad hoc external calls
- ADR: "Provider adapter contract and failure modes"
- product check: I haven't manually re-run the bootstrap script in a week

**Kill/pivot trigger:** if any one provider eats more than a week of integration time, drop it for now and ship with a single working adapter — the contract is the deliverable, not provider count.

---

## Phase 6 — Advanced charting, market analysis, and document data

**Goal:** turn Astraq into a tool you actually want to open every morning.

This is also where **MongoDB earns its keep** — for news, transcripts, and raw provider payloads where document storage is genuinely better than relational rows.

1. Upgrade the symbol page:
   - candles
   - volume
   - EMA / SMA overlays
   - Bollinger bands
   - crosshair sync across panes
2. Market analysis views:
   - watchlist performance table
   - relative performance comparison
   - drawdown chart
   - returns distribution
   - seasonality heatmap (`d3` lives here)
3. Saved chart layouts.
4. Streaming updates **only where they materially improve the UX** — not as a goal in itself.
5. Introduce MongoDB:
   - news headlines per symbol
   - earnings transcripts (when free sources allow)
   - raw provider payloads kept for replay/debugging
6. Wire the news layer into the symbol page.

**Learning focus:** RSC vs client boundaries, chart rendering, visualization design, performance, progressive hydration, document modeling.

**Exit criteria:**

- the app feels like a legitimate market dashboard, not a scaffold
- core chart pages work well on desktop and mobile
- news and headlines render alongside the chart for at least one symbol
- ADR: "Why Mongo for these collections specifically (and not Postgres JSONB)"
- product check: I can replace one daily browser tab habit (TradingView lite, finviz, etc.) with Astraq

**Kill/pivot trigger:** if the news layer is harder to source than to display, ship the chart upgrades on their own and defer Mongo to Phase 9. The roadmap should not block on data licensing.

---

## Phase 7 — Strategy engine and backtesting v1

**Goal:** move from passive analysis into active decision support.

1. Define a simple **strategy DSL in TypeScript**, validated with Zod and stored in `packages/shared`.
2. Support first rule-based strategies:
   - SMA crossover
   - RSI threshold
   - breakout
3. Build a backtest engine with:
   - entry and exit rules
   - commissions and slippage
   - equity curve output
   - trade log output
4. Let users save strategy definitions and run backtests from the UI.
5. Summary metrics: total return, Sharpe, max drawdown, win rate.

At this point Astraq becomes very strong for personal use even before heavy ML.

**Learning focus:** event-driven thinking, domain modeling, evaluation pipelines, result visualization, trading-system ergonomics.

**Exit criteria:**

- you can define a strategy, run a backtest, and inspect results in the UI
- backtest results are deterministic for a fixed input
- ADR: "Strategy DSL shape and versioning story"
- product check: at least one strategy definition I personally care about lives in the system

**Kill/pivot trigger:** if the DSL design takes more than a week without a single backtest running, pick the simplest possible JSON shape and move on.

---

## Phase 8 — Python analytics and ML service

**Goal:** expand Astraq from rule-based tooling into advanced research.

1. Upgrade `services/ml` structure: `app/api/`, `app/core/`, `app/data/`, `app/features/`, `app/models/`, `app/backtest/`, `app/services/`.
2. Finish Python tooling: `ruff` and `mypy` (strict on `app/`). **`uv` (lockfile + `.python-version`) and pytest are already in place.**
3. Feature engineering: returns, rolling volatility, RSI, MACD, ATR, OBV.
4. Statistical and classical ML models first: ARIMA / SARIMA, GARCH, gradient boosting for directional prediction.
5. Only after the classical baselines are honest, explore deeper models: LSTM, TCN, N-BEATS.
6. APIs for forecast bands, signal generation, advanced backtests.
7. Experiment tracking with MLflow if model work becomes active enough to justify it.

**Important:** ML upgrades Astraq, it does not delay usefulness.

**Learning focus:** Python project structure, feature pipelines, time-series evaluation, model serving, experiment hygiene.

**Exit criteria:**

- forecasts or signals can be requested from the main app and displayed meaningfully
- at least one model path is evaluated with time-series-safe validation (no leakage)
- ADR: "Time-series validation strategy"
- product check: I can read a forecast band on a chart I care about and have an opinion about whether it's reasonable

**Kill/pivot trigger:** if four weeks pass without a single model serving real predictions to the web app, downscope to a hand-rolled SMA-based "forecast" stub and revisit ML later.

---

## Phase 9 — Realtime, alerts, and `services/ingest`

**Goal:** make Astraq feel alive and operational.

1. Strategy execution against streaming or periodic data.
2. Alerts via:
   - email
   - in-app notifications
   - optional Telegram
3. Lightweight live updates for portfolio PnL, latest candles, triggered strategy conditions.
4. **Stand up `services/ingest`** as a Python websocket worker — once polling and scheduled refreshes from Phase 5 are no longer enough.
5. Use Redis Streams first; only reach for NATS if there's a real reason.

**Learning focus:** streaming trade-offs, background processing, event-driven updates, operational safety.

**Exit criteria:**

- Astraq can monitor market conditions and surface actionable updates without manual refresh
- `services/ingest` runs reliably for at least one market session
- ADR: "Why Redis Streams over NATS / Kafka for this scope"
- product check: I got an alert that actually changed what I did that day

**Kill/pivot trigger:** if `services/ingest` is failing to stay up overnight after a week, fall back to scheduled refreshes and capture the streaming work as a follow-up.

---

## Phase 10 — Observability, testing, performance

**Goal:** make the platform trustworthy. Tracing already exists from Phase 4 — this phase is about metrics, dashboards, and tightening the test pyramid.

1. Expand OpenTelemetry coverage to web and ML, with proper exporters.
2. Add Prometheus + Grafana dashboards for API latency, queue depth, ingestion lag, model serve time.
3. Expand the testing pyramid per [.cursor/rules/testing-strategy.mdc](./.cursor/rules/testing-strategy.mdc):
   - unit
   - integration with real infra
   - contract tests for the SDK
   - Playwright for core user journeys
4. Load testing for hot endpoints (symbol details, candle reads, order placement).
5. Profiling and query analysis for slow DB paths.
6. Define the first **SLOs** — request latency, ingestion freshness, alert delivery time.

**Learning focus:** production debugging, tracing, metrics, performance tuning, SLO thinking.

**Exit criteria:**

- failures are observable end-to-end
- critical user journeys are covered by repeatable automated tests
- at least three SLOs are defined and visible on a dashboard
- ADR: "First SLOs and what they protect"

**Kill/pivot trigger:** if dashboards stay empty because the app isn't deployed yet, swap order with Phase 11 — observability without traffic is theater.

---

## Phase 11 — Deployment and operations

**Goal:** deploy simply first, grow operational maturity from there.

1. Dockerfiles for `web`, `api`, and `ml` (and `ingest` if Phase 9 has shipped).
2. Production compose and environment templates.
3. Cheapest sensible deploy path first:
   - Vercel for web
   - Railway or Fly.io for API and ML
   - managed Postgres / Redis / Mongo
4. Secrets management with Doppler or SOPS.
5. Explore Kubernetes only after the app is already useful and deployed.
6. Backup and restore drill for Postgres + Mongo. Run it once for real.

**Learning focus:** deployment workflows, secrets handling, containerization, production readiness, recovery procedures.

**Exit criteria:**

- Astraq is accessible outside local development, on a domain you control
- deploys are repeatable and documented
- a real restore from backup has been performed at least once
- ADR: "Deployment topology and rollback story"
- product check: a friend can sign up and use the app without your laptop being on

**Kill/pivot trigger:** if production keeps breaking on every deploy, freeze features and spend a phase on CI/CD hardening before adding anything new.

---

## Beyond v1 — research and stretch

Only pick from these after Phase 7 has shipped and the core loop (watchlist → chart → strategy → backtest) is something you actually use weekly.

### Trading depth

- advanced order simulator with partial fills and latency modeling
- options support with payoff diagrams and Greeks
- factor dashboards and portfolio exposure analytics
- event sourcing for portfolio and order history

### Analytics depth

- regime detection and macro overlays
- alternative-data experiments (sentiment, search trends)
- model ensembling with proper out-of-sample evaluation

### Platform depth

- GraphQL gateway for comparison with REST + SDK
- gRPC between API and ML
- paid tiers, quotas, and a billing model
- mobile-first companion app

### AI depth

- LLM research assistant grounded in your transcripts and notes
- code-aware backtest authoring (natural language → strategy DSL)

---

## Recommended execution summary

1. Build the workspace and backend foundation (Phases 0–1).
2. Ship a useful personal product fast (Phase 2: data + shim auth + bootstrap candles + basic chart).
3. Harden auth (Phase 3) once the app is worth protecting.
4. Add paper trading and request tracing together (Phase 4) — money-handling code deserves traceability from day one.
5. Replace bootstrap ingestion with real infrastructure (Phase 5).
6. Upgrade charts and earn MongoDB its keep with news/transcripts (Phase 6).
7. Author and backtest strategies (Phase 7).
8. Layer in ML only after the core product loop is already valuable (Phase 8).
9. Go realtime and stand up `services/ingest` only when polling stops being enough (Phase 9).
10. Finish with observability, performance, and deployment maturity (Phases 10–11).

That order gives you earlier wins, better retention of new backend concepts, and a much higher chance that Astraq becomes something you genuinely use.
