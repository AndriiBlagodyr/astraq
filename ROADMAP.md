# Astraq Roadmap

> **Status (2026-09-24)** — Phase 0 (close the foundation) is next. Rewritten roadmap, see [Revision log](#revision-log).
> **Actually working today:** NestJS skeleton (Pino, request ids, Zod env, error filter, health), `packages/ui` design system + Storybook, Turborepo, `uv`-managed `services/ml` stub.
> **Not yet real:** any database, any web → api call, any chart, CI, local infra, deployment. Most `apps/web` routes are descriptive placeholders.
> **Rule for this block:** it describes what runs, not what is planned. Update it in the same PR that changes reality.

Astraq has two jobs at once:

1. Turn a frontend-heavy background into real fullstack depth — Node.js, Python, SQL, data modeling, infrastructure.
2. Become a personal market-research tool you actually use — not a sandbox of disconnected experiments.

The plan optimizes for both by shipping **one thin, deployed, end-to-end slice first** and then thickening it. Every later phase adds depth to something that already runs in production.

---

## Product North Star

**The core loop:** watchlist → chart → strategy → honest backtest → paper trade → review.

The first meaningful release lets you:

- sign in securely
- search US equities and keep watchlists
- read adjusted historical candles with indicators
- define simple rule-based strategies
- backtest them with bias guards you can trust
- paper trade the same rules and see accurate portfolio PnL

**The wedge** — what makes Astraq worth opening instead of TradingView: *honesty*. Backtests and paper trading share one fill model, results always show a buy-and-hold benchmark, and look-ahead or survivorship shortcuts are impossible by construction rather than by discipline. That is also where the deepest engineering learning lives.

If a task doesn't move the core loop forward or clearly deepen a core engineering skill, question it.

---

## Scope decisions

These are locked unless an ADR reverses them.

| Decision | Choice | Why |
|---|---|---|
| Asset class for v1 | **US equities, daily bars** | Matches current UI, teaches market calendars and corporate actions. Crypto arrives later as a second adapter. |
| Primary data provider | **Alpaca Market Data** (free plan) | Official API with keys, split/dividend-adjusted bars, asset list, market calendar, websocket feed for Phase 9. |
| Fallback provider | `yahoo-finance2` | Keyless, good for quick local bootstrap. Unofficial and brittle: never the only path. |
| Bar resolution | Daily until Phase 9 | Keeps storage, jobs, and fill logic simple while the domain model settles. |
| Price adjustment | Store raw bars + corporate actions; derive adjusted series | Needed for correct PnL on splits *and* correct backtests. |
| Money | `numeric` in Postgres, `Decimal` in TS/Python, never floats | Portfolio math must reconcile to the cent. |
| Time | `timestamptz` UTC everywhere; exchange-local only at the edges | Avoids DST and session-boundary bugs. |
| Deployment | From Phase 1, not the end | Product checks like "from my phone" need a real URL. Observability needs real traffic. |

---

## Stack

`AGENTS.md` holds repo-wide guardrails; this table is the authoritative stack and when each piece enters.

| Layer | Choice | Enters | Notes |
|---|---|---|---|
| Web | Next.js 16 App Router, RSC-first, TanStack Query for client state | now | Web is a BFF: holds tokens in `HttpOnly` cookies, never a second auth system. |
| UI | `packages/ui` (Tailwind + semantic tokens + headless primitives) | now | Trading patterns stay in `apps/web`. |
| Charts | `lightweight-charts` for OHLCV, `d3` only for bespoke visuals | Phase 1 / Phase 6 | |
| API | NestJS 11, `nestjs-zod`, `@nestjs/swagger` | now | Layering `controller → service → repository`. |
| Contracts | `packages/shared` (Zod) → OpenAPI → `packages/sdk` via `openapi-typescript` + `openapi-fetch` | Phase 1 | Small, readable generated client — no heavyweight codegen. |
| Cross-language contracts | Zod → JSON Schema (`z.toJSONSchema`) → Pydantic (`datamodel-code-generator`) | Phase 5 | One source of truth for the strategy DSL. CI fails on drift. |
| Relational + time series | Postgres 16 + TimescaleDB | Phase 0 infra, Phase 1 schema | |
| ORM / SQL | Prisma for relational models; hand-written SQL (Prisma TypedSQL / `$queryRaw`) for candle and analytics queries | Phase 1 | Learning goal: be fluent in real SQL, not just the ORM. Hypertables created in raw SQL migrations. |
| Cache, limits, queues | Redis 7 + BullMQ | Phase 2 (rate limits), Phase 4 (jobs) | |
| Node ↔ Python jobs | BullMQ on both sides (`bullmq` Python package for workers) | Phase 5 | One queue technology instead of BullMQ + Celery. |
| Documents | MongoDB 7 | Phase 4 | Raw provider payload archive, later news and research notes. Explicit learning goal; ADR compares against `JSONB`. |
| Python service | FastAPI, `uv`, polars, ruff, mypy (strict), pytest + hypothesis | now | Owns backtesting, analytics, and ML. Never owns transactional flows. |
| Streaming | Redis Streams → SSE to the browser | Phase 9 | NATS/Kafka dropped from scope. |
| Observability | Pino now → OpenTelemetry tracing in Phase 3 → metrics/dashboards in Phase 10 | | |
| CI/CD | GitHub Actions + Turborepo cache + `uv` cache, Renovate | Phase 0 | |
| Hosting | Vercel (web), Railway or Fly.io (api, ml workers), Postgres **with TimescaleDB support** | Phase 1 | Many managed Postgres products lack Timescale — verify before choosing. Timescale's own cloud or the official image on a volume both work. |
| Secrets | Platform env vars in Phase 1 → Doppler or SOPS once there's more than one environment | Phase 10 | |

**Dropped or deferred:** NATS (Redis Streams covers the scope), Celery/arq (replaced by BullMQ Python workers), Kubernetes (stretch), GraphQL/gRPC (stretch comparisons), MLflow (only if model work justifies it), a second backtest engine in TypeScript (never).

### Service boundaries

```text
browser ──► apps/web (BFF, RSC) ──SDK──► apps/api ──► Postgres/Timescale  (api is the only writer of domain tables)
                                            │   └──► Redis (cache, rate limits)
                                            │   └──► MongoDB (raw payloads, news, notes)
                                            └──BullMQ──► services/ml workers
                                                            └──► Postgres (read-only role on market data)
                                                            └──► job result returned to api, api persists it
```

- `services/ml` never writes domain tables. It reads market data through a read-only role and returns results through the job.
- Every cross-service shape lives in `packages/shared` or the generated OpenAPI — never duplicated by hand.

```text
astraq/
├── apps/
│   ├── web/      Next.js 16 frontend (BFF)
│   └── api/      NestJS domain API
├── services/
│   ├── ml/       FastAPI + BullMQ workers: backtests, analytics, forecasting
│   └── ingest/   streaming ingestor (Phase 9)
├── packages/
│   ├── ui/       tokens + accessible core components
│   ├── shared/   Zod schemas, exported JSON Schema
│   └── sdk/      generated OpenAPI client
├── infra/
│   └── docker/   local compose
└── docs/
    └── decisions/  ADRs
```

---

## Working rules

### Delivery

- **Walking skeleton first.** Each phase extends something already deployed. No phase ends with work that only runs locally.
- **Time boxes.** Each phase has an estimate (assuming ~10–12 hours/week). Passing 1.5× the estimate triggers the phase's kill/pivot rule — descope, don't grind.
- **Exit green or change the rule.** Don't start a phase until the previous one exits. If you deliberately carry a gap forward, record it under "Carried gaps" in the status block — never silently.
- **No placeholder routes.** A route exists only when it renders real data. Future ideas live in this file, not in the UI.
- **One implementation path.** Alternatives become ADRs, not parallel code.
- **User-facing features ship complete:** schema → service → repository → tests → OpenAPI → SDK → web → deployed.

### Definition of done (every phase)

1. Code merged to `master`, CI green, deployed.
2. Tests at the right level (see [testing strategy](./.cursor/rules/testing-strategy.mdc)).
3. At least one ADR in `docs/decisions/`.
4. Status block at the top of this file updated.
5. **Product check** passed — a concrete usage outcome, not a feature list.

### Cross-cutting

- **Security.** Follow [security and secrets](./.cursor/rules/security-and-secrets.mdc). Env validated at boot in every service; fail-closed CORS, auth, and permissions.
- **Learning over shipping** — when a library exists *and* there's a teaching opportunity, build one layer by hand first (refresh-token rotation, ledger accounting, event-driven backtester). Write down what you'd replace it with in production.
- **Data licensing.** Provider data is for personal use. No public pages that redistribute raw vendor data; a friend's account (Phase 10) is still private use.
- **Finance correctness is a first-class concern**, not a detail: adjusted prices, trading calendars, point-in-time data, decimal money.

---

## Completed

### Design system foundation (formerly Phase 1.5) — done

`packages/ui` with semantic tokens, independent theme identity and light/dark mode, headless primitives, Storybook, and tests. Mantine removed. ADR 0001.
Follow-up folded into Phase 0: app pages still style themselves with `layout.module.css` — migrate the surviving routes to `packages/ui` compositions.

---

## Phase 0 — Close the foundation · ~1 week

**Goal:** make the repo honest, reproducible, and verified by CI before anything else is built on it.

1. **Hygiene:** untrack `apps/api/tsconfig.build.tsbuildinfo`, `apps/web/test-results/`, and `services/ml/*.egg-info/`; ignore `*.tsbuildinfo`. Align `requires-python` with the pinned 3.12.
2. **Delete placeholder routes** in `apps/web`. Keep marketing, auth screens, `/status`, and one app shell. Routes come back in the phase that fills them.
3. **Local infra** in `infra/docker/compose.yml`: Postgres 16 + TimescaleDB, Redis 7. (Mongo and Mailhog join in the phases that use them.) Root scripts `pnpm infra:up` / `infra:down`.
4. **Env validation everywhere:** `pydantic-settings` in `services/ml`; add `CORS_ORIGINS`, `DATABASE_URL`, `REDIS_URL` to the API schema. Replace `app.enableCors()` with an allowlist.
5. **CI** (GitHub Actions): install, lint, typecheck, unit tests for all Node packages and `services/ml`, with Turborepo and `uv` caching. Add ruff + mypy to the ML job now — cheap while the codebase is tiny.
6. **Renovate** with grouped, weekly updates.
7. Echo `x-request-id` back in API responses.

**Learning focus:** reproducible environments, CI pipelines, container basics.

**Exit criteria:**

- fresh clone → `pnpm install && pnpm infra:up && pnpm dev` boots everything with no manual steps
- CI is green and required on `master`
- every service crashes on invalid env
- ADR 0002: "pnpm + Turborepo, and how Python lives in the monorepo"

**Kill/pivot trigger:** if CI or compose polish runs past a week, ship whatever runs and list the gaps under "Carried gaps".

---

## Phase 1 — Walking skeleton: candles end to end · ~2–3 weeks

**Goal:** one real feature from provider to deployed chart, proving every layer and contract at once.

1. **Contracts:** create `packages/shared` (Zod) and wire `nestjs-zod` + `@nestjs/swagger`. Emit `openapi.json` at build and commit it. Generate `packages/sdk` with `openapi-typescript` + `openapi-fetch`. CI fails if the committed spec or SDK drifts from the code.
2. **Schema (Prisma + raw SQL migration):**
   - `Symbol` (ticker, name, exchange, active flag)
   - `candles_daily` hypertable: `(symbol_id, ts)` primary key, raw OHLCV, `numeric` prices
   - `corporate_actions` (split ratio / dividend, ex-date)
3. **Bootstrap CLI** (`apps/api` script): fetch daily raw bars + corporate actions for a fixed list of ~20 tickers from Alpaca (Yahoo fallback) and upsert them. Idempotent, synchronous, no queues.
4. **Endpoints:** `GET /api/symbols?query=`, `GET /api/symbols/:ticker/candles?from&to&adjusted=true`. Adjustment is computed in SQL from raw bars + corporate actions — the first hand-written query worth being proud of.
5. **Web:** `/stocks/[symbol]` renders a real `lightweight-charts` candle + volume pane from the SDK, with loading, empty, and error states. Symbol search on `/stocks`.
6. **Deploy:** web on Vercel, api on Railway/Fly, Postgres with Timescale support. Preview deploys for web PRs. `/health/ready` really checks the database.
7. Remove the `/predictions/summary` and ML `/predict` stubs — dead placeholders teach nothing.

**Learning focus:** OpenAPI and typed clients, migrations, hypertables, composite keys, SQL window functions, RSC vs client boundaries for charts, first deployment.

**Exit criteria:**

- a deployed URL shows adjusted candles for any bootstrapped ticker
- an integration test runs the candle endpoint against real Timescale in CI (Testcontainers or a compose service)
- a unit test proves split adjustment with a known split (e.g. NVDA 2024 10:1)
- ADR 0003: "NestJS + OpenAPI-generated SDK as the web ↔ api contract"
- ADR 0004: "Hosting topology and Timescale availability"
- **product check:** I opened a candle chart on my phone from the deployed URL

**Kill/pivot trigger:** if the bootstrap starts growing retries, caching, or multi-provider logic, stop — that's Phase 4. If NestJS DI is blocking progress after two weeks, fall back to Fastify with a hand-rolled module pattern and record why.

---

## Phase 2 — Accounts and watchlists · ~3 weeks

**Goal:** real authentication, built once, protecting the first personal data.

No temporary auth shim: the skeleton already shows value without login, so there's nothing to migrate later. Build the auth core properly now and defer the peripheral flows to Phase 7.

1. **Auth core, hand-built:**
   - registration + login with **Argon2id**
   - short-lived JWT access token + **rotating opaque refresh token with family-based reuse detection**
   - logout and "log out everywhere"
   - web BFF stores tokens in `HttpOnly`, `Secure`, `SameSite=Lax` cookies and refreshes transparently
2. **Registration is invite-only** (env allowlist of emails) while the app is deployed without email verification.
3. **Abuse protection:** Redis-backed rate limiting on auth endpoints, CSP and security headers in Next middleware.
4. **Schema:** `User`, `Session`, `RefreshToken`, `Watchlist`, `WatchlistItem`, `AuditLog`.
5. **Watchlists:** create, rename, reorder, add/remove symbols. Watchlist page shows last close, day change, and a sparkline per row from stored candles.
6. **Symbol universe:** load the full active US equity list from Alpaca into `Symbol` so search covers everything; candles for a newly watched symbol are fetched on demand by the bootstrap path.

**Learning focus:** password hashing, token rotation, session security, cookie semantics, CSRF/CORS, rate limiting, authorization at the repository layer.

**Exit criteria:**

- register → login → refresh → logout works end to end on the deployed app
- reuse of a rotated refresh token revokes the whole family (integration-tested)
- users cannot read or modify another user's watchlist (tested at API level)
- ADR 0005: "Refresh-token rotation and reuse-detection design"
- **product check:** I keep my real watchlist in Astraq and stay logged in on my phone

**Kill/pivot trigger:** if the auth core isn't stable after three weeks, ship without "log out everywhere" and fine-grained rate limits. Rotation and reuse detection are non-negotiable.

---

## Phase 3 — Paper trading and portfolio accounting · ~3–4 weeks

**Goal:** a portfolio whose numbers you would bet on, and the tracing to prove it.

1. **Fill model ADR first.** It will be shared with the backtester in Phase 5:
   - market orders placed outside market hours fill at the next session's open
   - market orders during the session fill at the latest known price (latest daily close until realtime exists), plus configurable slippage
   - limit orders fill when a bar's range crosses the limit
   - commissions are configurable per portfolio
2. **Ledger-based accounting, hand-built:** every cash and position change is an immutable ledger entry; balances and positions are *derived*. Realized PnL uses FIFO lots (average cost can come later).
3. **Order lifecycle:** `Portfolio`, `Order`, `Fill`, `Lot`, `LedgerEntry`. Place, cancel, fill. **Idempotency keys** on order placement.
4. **Corporate actions:** applying a split adjusts open lots. Dividends credit cash on the pay date.
5. **Risk rules:** market-calendar awareness (Alpaca calendar), max order notional, insufficient-cash and short-selling guards.
6. **Portfolio screens:** holdings, cash, realized/unrealized PnL, equity curve, orders and fills — restore the `/portfolio` routes with real data.
7. **Tracing:** OpenTelemetry in `apps/api` and the web BFF, with a span per order placement and propagation web → api → database. Local Jaeger in compose.
8. **Backups:** automated nightly Postgres backups on the host — paper trades are now data worth keeping.

**Learning focus:** transactions and isolation levels, invariants, double-entry thinking, decimal math, idempotency, instrumentation.

**Exit criteria:**

- property-based tests (fast-check) prove invariants: cash + market value reconciles with the ledger, no negative positions without short permission, and replaying the ledger reproduces the state
- concurrent duplicate order submissions with the same idempotency key produce exactly one order (integration test against real Postgres)
- a split on a held symbol leaves the portfolio's market value unchanged
- every order is traceable from browser request to SQL statement
- ADR 0006: "Fill model shared by paper trading and backtesting"
- ADR 0007: "Ledger accounting and order transaction boundaries"
- **product check:** I placed at least five paper trades in a week and the PnL matched my own spreadsheet

**Kill/pivot trigger:** if PnL drifts between sessions, stop adding features until the property tests find the bug.

---

## Phase 4 — Market data pipeline · ~3 weeks

**Goal:** replace the bootstrap with ingestion you never have to think about.

1. **`MarketDataProvider` contract** with Alpaca and Yahoo adapters. Contract tests run the same suite against both, using recorded fixtures.
2. **BullMQ jobs:** symbol backfill, end-of-day refresh, corporate-action refresh. Retries with backoff, a dead-letter queue, idempotent upserts.
3. **Scheduling from the exchange calendar**, not from cron guesses: refresh after the close on trading days only; handle half days.
4. **Data quality checks:** missing sessions, duplicate bars, OHLC sanity (low ≤ open/close ≤ high), stale symbols. Failures surface on `/status`.
5. **Timescale maintenance:** compression and retention policies, a continuous aggregate for weekly bars.
6. **Redis caching** for hot reads (latest bar per symbol, symbol search).
7. **MongoDB enters:** an append-only archive of raw provider responses (schema varies by provider and version, TTL index, replayable into the normalizer). Add Mongo + Mongo Express to compose.
8. Bull Board (or equivalent) behind admin auth to inspect queues.

**Learning focus:** adapter pattern, contract testing, queue design, retry semantics, data quality, time-series storage policies, document modeling.

**Exit criteria:**

- any watched symbol stays fresh automatically for two weeks with no manual action
- replaying one archived raw payload reproduces the stored bars exactly
- ADR 0008: "Provider contract and failure modes"
- ADR 0009: "MongoDB vs Postgres JSONB for the raw payload archive" — if JSONB wins, drop Mongo and say so
- **product check:** I haven't run the bootstrap script by hand in two weeks

**Kill/pivot trigger:** if the second adapter costs more than a week, ship with Alpaca only. The contract is the deliverable, not the number of providers.

---

## Phase 5 — Strategy DSL and backtesting v1 · ~4 weeks

**Goal:** close the core loop — define a rule, test it honestly, trade it on paper.

1. **Strategy DSL** as a versioned JSON structure defined in Zod in `packages/shared`:
   - indicators (SMA, EMA, RSI, ATR, Bollinger), comparisons, crossovers, AND/OR
   - entry rules, exit rules, stop-loss / take-profit, position sizing (fixed notional or % of equity)
   - `version` field from day one
   - exported to JSON Schema → Pydantic models in `services/ml`, with CI checking for drift
2. **Event-driven backtester, hand-built in Python** (`services/ml/app/backtest/`): bar events → strategy → signals → orders → fills, using the **same fill model as Phase 3** (ported and tested against shared fixtures).
3. **Bias guards by construction:**
   - a signal computed on bar *t* can only fill at bar *t+1* or later
   - the engine only sees data up to the current bar (point-in-time iterator, no dataframe look-ahead)
   - adjusted prices for signals, raw prices plus corporate actions for fills and cash
   - delisted symbols stay in the universe for dates when they traded
4. **Job flow:** api validates and stores the strategy → enqueues a BullMQ backtest job → Python worker runs it → result returns through the job → api persists `BacktestRun` + trades + equity curve.
5. **Metrics:** CAGR, volatility, Sharpe, Sortino, max drawdown and duration, win rate, exposure, turnover — always next to a **buy-and-hold benchmark**.
6. **UI:** strategy builder form (templates for SMA crossover, RSI threshold, breakout), run list, result page with equity curve vs benchmark, drawdown pane, and trade markers on the candle chart. Restore `/strategies` and `/backtests`.
7. **Paper-trade a strategy:** a daily job evaluates saved strategies after the close and places paper orders through the Phase 3 order path.

**Learning focus:** event-driven design, cross-language contracts, job orchestration, quantitative evaluation, result visualization.

**Exit criteria:**

- the same strategy + data + seed produces byte-identical results (golden-file test)
- a **parity test** shows backtest fills match fills from replaying the same signals through the paper-trading engine
- a deliberately leaky strategy (peeking at tomorrow's close) is rejected or has no effect
- ADR 0010: "Strategy DSL shape and versioning"
- ADR 0011: "Bias guards in the backtest engine"
- **product check:** a strategy I care about has been running on a paper portfolio for two weeks

**Kill/pivot trigger:** if the DSL design runs past a week without a backtest running, freeze it at SMA crossover + RSI threshold and move on.

---

## Phase 6 — Analysis dashboard and research journal · ~3 weeks

**Goal:** make Astraq the tab you open every morning.

1. **Symbol page upgrade:** multi-pane layout with synced crosshairs, indicator overlays (EMA/SMA/Bollinger), RSI/MACD panes, markers for your fills and strategy signals.
2. **Analysis views:** watchlist performance table, relative performance comparison, drawdown chart, returns distribution, seasonality heatmap (`d3`).
3. **Saved chart layouts** (Postgres `JSONB` — relational ownership, flexible payload).
4. **News per symbol** from a free source into MongoDB, shown on the symbol page.
5. **Research journal:** notes attached to a symbol, trade, or backtest run, with tags and full-text search. Use Mongo or Postgres per the Phase 4 ADR.
6. Mobile layout pass across all core pages.

**Learning focus:** chart performance, visualization design, progressive hydration, document modeling, full-text search.

**Exit criteria:**

- core pages are usable at phone and desktop widths
- symbol page interaction stays under 100 ms on 10 years of daily bars (measured)
- ADR 0012: "Chart composition: lightweight-charts panes vs d3 views"
- **product check:** Astraq replaced one daily habit (finviz, TradingView lite, a spreadsheet)

**Kill/pivot trigger:** if sourcing news is harder than displaying it, ship charts and the journal without news.

---

## Phase 7 — Account hardening · ~2 weeks

**Goal:** make accounts safe enough to invite someone else.

1. Email verification and password reset (Mailhog locally, a transactional email provider in prod).
2. TOTP 2FA with recovery codes.
3. Personal API keys (hashed, scoped, revocable) for scripts and bots.
4. Roles: `user`, `admin` (add `pro` only if billing ever happens).
5. Admin-only operational pages (queues, data quality, users).
6. Replace the invite allowlist with verified open registration, or keep invites — decide in the ADR.

**Learning focus:** email flows, OTP, key management, authorization models.

**Exit criteria:**

- a new user can register, verify, enable 2FA, reset their password, and recover with a recovery code
- ADR 0013: "2FA and API-key design"
- **product check:** a friend signed up without my help

**Kill/pivot trigger:** if email deliverability eats the phase, keep invite-only and ship 2FA + API keys.

---

## Phase 8 — Forecasting and signals · ~4–5 weeks

**Goal:** add research depth without faking predictive power.

1. `services/ml` structure: `app/api`, `app/core`, `app/data`, `app/features`, `app/models`, `app/backtest`, `app/workers`.
2. **Feature pipeline** (polars): returns, rolling volatility, RSI, MACD, ATR, OBV — computed point-in-time, shared with the backtester.
3. **Walk-forward validation harness first**, before any model: expanding window, embargo gap, benchmark against naive forecasts.
4. Baselines, in order: naive / drift / SMA → ARIMA and GARCH (volatility bands) → gradient boosting for direction.
5. Forecast bands and signal overlays on the symbol chart, with each model's out-of-sample score shown next to its forecast.
6. **ML signals become DSL inputs**, so the Phase 5 backtester evaluates them like any other rule.
7. MLflow only if you're comparing more than a handful of runs a week.

**Learning focus:** time-series validation, feature engineering, statistical modeling, model serving, experiment hygiene.

**Exit criteria:**

- every served model has a model card: data window, validation method, out-of-sample metrics vs naive baseline
- the leakage test suite passes (shuffled-target and future-feature canaries)
- ADR 0014: "Time-series validation strategy"
- **product check:** I read a forecast band on a chart I care about and can say whether it beats naive

**Kill/pivot trigger:** if four weeks pass without a model beating naive out of sample, ship the volatility bands (GARCH) and the harness — an honest "no edge" result is a valid outcome.

---

## Phase 9 — Realtime and alerts · ~3–4 weeks

**Goal:** make Astraq feel alive without making it fragile.

1. **`services/ingest`** (Python): Alpaca websocket (IEX) for watched symbols → Redis Streams, with reconnects, heartbeats, and gap backfill.
2. Intraday bars (1-minute hypertable + continuous aggregates). Paper-trading fills move to latest-trade price during the session.
3. **Live updates over SSE** (simpler than websockets for one-way data): latest price, portfolio PnL, triggered alerts.
4. **Alerts:** price and indicator conditions, strategy signals; delivered in-app, by email, and optionally by Telegram. Deduplicated with cool-downs.
5. Optional second adapter: Binance for 24/7 crypto, exercising the calendar abstraction.

**Learning focus:** streaming trade-offs, backpressure, reconnection logic, event-driven UI, operational safety.

**Exit criteria:**

- ingest survives a full trading week including a forced restart, with gaps backfilled automatically
- alerts arrive within 60 seconds of the triggering condition
- ADR 0015: "Redis Streams + SSE for this scope"
- **product check:** an alert changed what I did that day

**Kill/pivot trigger:** if ingest can't stay up for a week, fall back to 5-minute polling and keep alerts.

---

## Phase 10 — Operate: observability, performance, reliability · ~3 weeks

**Goal:** run Astraq like a small production system. There's real traffic by now, so the dashboards mean something.

1. OpenTelemetry across web, api, ml workers, and ingest; metrics to Prometheus + Grafana (or Grafana Cloud's free tier).
2. Dashboards: API latency, queue depth, job failures, ingestion lag, data freshness, model serve time.
3. **SLOs** with alerting: candle freshness, API p95 latency, alert delivery time.
4. Load tests (k6) on candle reads, order placement, and backtest submission; fix the slowest queries using `EXPLAIN ANALYZE`.
5. **Restore drill:** restore Postgres (and Mongo, if kept) from backup into a fresh environment, and time it.
6. Secrets move to Doppler or SOPS. Staging environment. A documented rollback procedure.
7. Complete the test pyramid: SDK contract tests, and Playwright journeys for login → watchlist → backtest → paper trade.

**Learning focus:** SLO thinking, production debugging, performance tuning, disaster recovery.

**Exit criteria:**

- three SLOs defined, visible, and alerting
- a real restore performed and documented, with the measured recovery time
- ADR 0016: "SLOs and what they protect"
- **product check:** I found and fixed a production issue from a dashboard, not a bug report

**Kill/pivot trigger:** if deploys keep breaking, freeze features and harden CI/CD before anything else.

---

## Beyond v1 — research and stretch

Only after the core loop has been in weekly use for a month.

- **Trading depth:** partial fills and latency modeling, options with payoff diagrams and Greeks, factor exposure, event-sourced order history.
- **Research depth:** regime detection, parameter sweeps with overfitting guards (deflated Sharpe, walk-forward optimization), portfolio-level backtests.
- **Platform comparisons:** GraphQL gateway vs REST + SDK, gRPC between api and ml, Kubernetes deployment.
- **AI depth:** an LLM research assistant grounded in your journal and news, and natural language → strategy DSL (validated by the same Zod schema).

---

## Learning map

| Skill | Where it's learned |
|---|---|
| SQL, indexing, time series | Phase 1 (adjustment query), Phase 4 (policies, aggregates), Phase 10 (query tuning) |
| Transactions and invariants | Phase 3 (ledger, idempotency, isolation) |
| Auth and security | Phase 2 (core), Phase 7 (hardening) |
| API design and contracts | Phase 1 (OpenAPI/SDK), Phase 5 (cross-language DSL) |
| Queues and distributed jobs | Phase 4 (ingestion), Phase 5 (Node → Python workers) |
| Document databases | Phase 4 (raw archive), Phase 6 (news, journal) |
| Python engineering | Phase 5 (engine), Phase 8 (ML), Phase 9 (ingest) |
| Quant correctness | Phases 1, 3, 5, 8 (adjustment, fills, bias guards, validation) |
| Frontend and visualization | Phase 1 (first chart), Phase 6 (dashboard), Phase 9 (live UI) |
| Operations | Phase 0 (CI), Phase 1 (deploy), Phase 3 (tracing), Phase 10 (SLOs, DR) |

**Estimated total:** roughly 34–40 weeks at 10–12 hours/week for Phases 0–10. Re-estimate at the start of every phase.

---

## Revision log

**2026-09-24 — full rewrite.** Key changes from the previous plan:

- Deployment moved from Phase 11 to Phase 1; the first phase is now a walking skeleton (provider → database → API → SDK → chart → deployed URL).
- Temporary auth shim removed: the auth core is built once in Phase 2, and peripheral flows move to Phase 7.
- Strategies and backtesting moved ahead of advanced charting, because they complete the core loop.
- One backtest engine (Python) that shares a fill model with paper trading, replacing the earlier TypeScript v1 + Python "advanced" split.
- Scope locked to US equities on daily bars; Alpaca is the primary provider and Yahoo the fallback.
- Finance correctness made explicit: corporate actions, adjusted vs raw prices, trading calendars, decimal money, bias guards.
- MongoDB enters in Phase 4 with an ADR that may remove it; NATS, Celery, and TypeScript backtesting dropped.
- Added time boxes, a definition of done, a no-placeholder-routes rule, an honest status block, and a learning map.
- The completed design-system phase (1.5) is recorded under Completed.
