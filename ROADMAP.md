# Veracand Roadmap

## Status (2026-11-17)

> **Rule for this block:** it describes what runs, not what is planned. Update it in the same PR that changes reality.

**Where each phase stands**

| Phase | State | What's left to exit |
|---|---|---|
| Design system v2 | done | — |
| 0 — Foundation | done but one setting | make CI a required check on `master` (GitHub setting) |
| 1 — Walking skeleton | code-complete | create the Railway and Vercel projects, first deploy, phone check ([docs/deploy.md](docs/deploy.md), ADR 0005) |
| 2 — Accounts, watchlists, first D3 view | code-complete | the end-to-end auth check and the product check, both on the deployed app; the row-to-header morph waits for Phase 6 |
| 3 — Paper trading | api done through item 5, first pages up | the rest of item 6 (the order ticket and Orders tab, Activity, the equity curve), items 7 and 8; items 1 to 5 are done |

**Next, in order**

1. **Deploy** (only you can: the accounts are yours). Three phases now wait on it, and every product check needs a real URL.
2. **Phase 3 item 6, next slice:** the Orders tab and the order ticket, on the preview endpoint that now exists. Until then an order can only be placed through the api.
3. **Phase 3 item 6:** the Activity tab (`GET .../activity`, lots per position), then the equity curve and day PnL.
4. Run `calendar:sync` once with Alpaca keys and compare a known holiday and half day: the calendar loader is tested against the documented response, not yet against the live endpoint.
5. Try the keyboard reorder in a browser: the one [audit follow-up](#audit-follow-ups) that needs eyes.

**Working today**

- **Foundation.** `pnpm dev` starts web, api, ml, and the UI package watcher; `pnpm infra:up` runs Postgres 16 + TimescaleDB and Redis 7; `pnpm db:migrate` applies the Prisma migrations. Every service validates its env at boot. GitHub Actions runs lint, typecheck, and unit tests for every Node package, the token drift check, the contract drift check (`pnpm contract` must leave `openapi.json` and the SDK unchanged), the api's integration tests against a TimescaleDB container, and ruff, mypy, and pytest for `services/ml`. Renovate opens grouped dependency PRs weekly.
- **Contracts.** Requests and responses are validated against Zod schemas from `packages/shared`; a committed `openapi.json`, Swagger UI at `/api/docs` outside production, and the typed `packages/sdk` client generated from the spec.
- **UI kit.** `@astraq/ui` 0.2.0: Base UI components, generated tokens, 6 themes × light/dark, density, built ESM, Storybook with docs pages.
- **Market data.** `symbols`, `corporate_actions`, and the `candles_daily` hypertable. `symbols:sync` loads the active US equity list; `bootstrap` fills daily bars and corporate actions from Alpaca for ~20 tickers (a rerun replaces corrected actions and fills dividend pay dates); watching a symbol or placing an order for it loads its history on demand. `GET /api/symbols` (best match first) and `GET /api/symbols/:ticker/candles` serve them, split- and dividend-adjusted in SQL by an exact `numeric_product` aggregate. `GET /api/symbols/:ticker/returns` computes daily returns and their summary stats in SQL.
- **Accounts** ([ADR 0006](docs/decisions/0006-refresh-token-rotation-and-reuse-detection.md)). Invite-only registration (`INVITE_EMAILS`), Argon2id login, rotating refresh tokens with family reuse detection, logout and "log out everywhere", Redis-backed rate limits counted per browser. `/api/me` serves the profile and the signed-in devices.
- **Watchlists.** `/api/watchlists/*` creates, renames, deletes, and reorders lists and their symbols, every query scoped by the owner's id; rows carry last close, day change, and a 30-session sparkline, and the index names each list's best and worst movers.
- **Paper trading** ([ADR 0008](docs/decisions/0008-fill-model-shared-by-paper-trading-and-backtesting.md), [ADR 0009](docs/decisions/0009-ledger-accounting-and-order-transaction-boundaries.md)). `/api/portfolios/*` creates paper portfolios with starting cash and trading costs, moves cash in and out, and places (once per `Idempotency-Key`), lists, and cancels orders. Orders fill by the shared fill model (`apps/api/src/trading/fill-model.ts`, specified by `packages/shared/fixtures/fill-model.json`). Every fill, cash move, split, and dividend is a transaction in a double-entry ledger that derives cash, FIFO lots, realized PnL, and dividends by replay, on a hand-built exact decimal. A portfolio is settled whenever it is read or written, before anything is added to it (`apps/api/src/trading/settlement.ts`). `GET /api/portfolios/{id}` prices each position at its latest stored close: market value, unrealized PnL, and the portfolio's equity (`apps/api/src/trading/valuation.ts`). An order is checked when it is placed (`apps/api/src/trading/risk.ts`, ADR 0009 section 9): one the portfolio can't cover at the latest close or its limit, net of open orders, or one over the portfolio's largest order, is a 422 and isn't stored. `POST .../orders/preview` answers the same check without placing anything: when the order would fill, the estimated cost, the cash after, and the refusal if any.
- **Exchange calendar.** `market_sessions` holds each trading day's open and close, from Alpaca's calendar (`calendar:sync`; with Alpaca keys the api also reloads the year ahead when the table runs short). Where it is loaded, a market order placed on a holiday or after a half day's early close waits for the next session instead of filling at the last close. Where it isn't, the clock falls back to weekdays, 09:30 to 16:00.
- **Web.** One app shell with the ⌘K command palette, keyboard shortcuts, the theme menu, the user menu, and a route crossfade. Today (a card per watchlist, recently viewed stocks), `/stocks` and `/stocks/[symbol]` (a `lightweight-charts` candle + volume chart with range presets, a custom range, split-adjusted / raw prices, split markers), `/watchlists` and `/watchlists/[id]` (server actions, undo, drag or keyboard reorder), `/portfolios` (each portfolio's equity, cash, and total return; create one with its cash, costs, and largest order) and `/portfolios/[id]` (equity and where it comes from, positions at their latest close with weights, paper cash in and out), `/analysis/returns` (a hand-built D3 histogram beside a stats table), `/settings` and `/settings/sessions`, `/status` (live api and ml health with each build's commit), and register / login / logout through BFF routes that keep the tokens in `HttpOnly` cookies. `proxy.ts` does the session check with silent refresh, CSP, and the security headers.
- **ML.** `services/ml` is a `uv`-managed FastAPI stub with validated settings; it does nothing yet (Phase 5).

**Not yet real**

- Deployment (prepared, not live) and CI as a required check on `master`.
- Placing an order in the web app: the order ticket and the Orders tab (Phase 3 item 6). The portfolio pages show holdings that only the api can create.
- The Activity tab, lots per position, the equity curve, and day PnL (item 6).
- The exchange calendar on the live Alpaca endpoint: the loader hasn't run against it yet. A database where it never ran still knows weekends only.
- A job that settles portfolios and loads bars after the close: portfolios settle when read, and bars arrive only by the bootstrap or on first watch (Phase 4). Until then a bar or corporate action loaded late is applied late.
- Redis holds only rate-limit counters.

**Carried gaps**

- **Phase 2 → 3:** Phase 3 started on 2026-11-12 before Phase 2 exited: its end-to-end auth check and product check need the deployed app.
- **Phase 1 → 2:** Phase 2 started on 2026-10-21 before Phase 1 exited: the first deploy, CI as a required check, and the phone check are still open.
- **Smaller, from Phase 1:** the chart's OHLCV readout follows the mouse, with no keyboard way to inspect a bar (Phase 6 chart work); a split and a dividend on the same ex-date make the `all` adjustment slightly wrong (rare; revisit with the Phase 4 data-quality checks).

Rewritten roadmap, see [Revision log](#revision-log).

Veracand has two jobs at once:

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

**The wedge** — what makes Veracand worth opening instead of TradingView: *honesty*. Backtests and paper trading share one fill model, results always show a buy-and-hold benchmark, and look-ahead or survivorship shortcuts are impossible by construction rather than by discipline. That is also where the deepest engineering learning lives.

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
| Web | Next.js 16 App Router, RSC-first; server actions for writes. TanStack Query joins when something needs a client-side cache (Phase 9 live data) | now | Web is a BFF: holds tokens in `HttpOnly` cookies, never a second auth system. |
| UI | `packages/ui` (Tailwind + semantic tokens + headless primitives) | now | Trading patterns stay in `apps/web`. |
| Charts | `lightweight-charts` for OHLCV, `d3` only for bespoke visuals | Phase 1 / Phase 2 | First `d3` view (returns distribution) in Phase 2; the rest in Phase 6. |
| API | NestJS 11, `nestjs-zod`, `@nestjs/swagger` | now | Layering `controller → service → repository`. |
| Contracts | `packages/shared` (Zod) → OpenAPI → `packages/sdk` via `openapi-typescript` + `openapi-fetch` | Phase 1 | Small, readable generated client — no heavyweight codegen. |
| Cross-language contracts | Zod → JSON Schema (`z.toJSONSchema`) → Pydantic (`datamodel-code-generator`) | Phase 5 | One source of truth for the strategy DSL. CI fails on drift. |
| Relational + time series | Postgres 16 + TimescaleDB | Phase 0 infra, Phase 1 schema | |
| ORM / SQL | **Prisma is the only database toolkit on the Node side**: Prisma Client for models, Prisma Migrate for every schema change, TypedSQL (`$queryRaw` as fallback) for hand-written candle and analytics queries, `prisma db seed` for fixtures. No second ORM, query builder, or migration tool (no Drizzle, Kysely, TypeORM, Knex, node-pg-migrate) | Phase 1 | Learning goal: be fluent in real SQL, not just the ORM. TimescaleDB DDL (extension, hypertables, later compression and continuous aggregates) lives in Prisma migrations made with `migrate dev --create-only` and edited by hand. Prisma is Node-only: `services/ml` reads Postgres with a plain SQL driver against the schema Prisma owns, and never migrates it. |
| Cache, limits, queues | Redis 7 + BullMQ | Phase 2 (rate limits), Phase 4 (jobs) | |
| Node ↔ Python jobs | BullMQ on both sides (`bullmq` Python package for workers) | Phase 5 | One queue technology instead of BullMQ + Celery. |
| Documents | MongoDB 7 via Prisma's MongoDB connector (separate Prisma schema and client), not Mongoose | Phase 4 | Raw provider payload archive, later news and research notes. Explicit learning goal; ADR compares against `JSONB`. Check that the Prisma major in use supports MongoDB before Phase 4 starts. Prisma has no MongoDB migrations, so TTL and other indexes are created in a small idempotent script. |
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
- **Pages and navigation.** Every route, menu item, and the home page's contents per phase are in [docs/ui-plan.md](docs/ui-plan.md). A phase's web work builds the pages listed there for it.
- **Motion.** UI motion follows [docs/motion-and-delight-plan.md](docs/motion-and-delight-plan.md). Each phase ships the motion items listed for it there; none are built on placeholder routes.
- **Finance correctness is a first-class concern**, not a detail: adjusted prices, trading calendars, point-in-time data, decimal money.

---

## Completed

### Design system foundation (formerly Phase 1.5) — done

`packages/ui` with semantic tokens, independent theme identity and light/dark mode, headless primitives, Storybook, and tests. Mantine removed. ADR 0001.

### Design system v2 — done

Base UI primitives, a generated token pipeline, 6 themes, density, and an extractable `@astraq/ui` (`0.2.0`, see `packages/ui/CHANGELOG.md`). [ADR 0002](docs/decisions/0002-design-system-base-ui-and-token-architecture.md); tracked in [docs/design-system-plan.md](docs/design-system-plan.md) as 7 PRs.

- PR 1 (restructure, interaction states) — done
- PR 2 (hand-built token pipeline, full per-theme palettes, contrast matrix) — done
- PR 3 (Base UI migration) — done
- PR 4 (6 themes + density) — done
- PR 5a (form components, hand-built SegmentedControl) — done
- PR 5b (overlays and feedback: Popover, Menu, ContextMenu, AlertDialog, Drawer, Toast, PreviewCard, Progress, Meter, Skeleton, Spinner sizes) — done
- PR 5c, 5d, 6 (display, data, distribution) — done
- PR 7 (Storybook docs pages, raw-color lint rule, alias cleanup) — done
- Follow-up: the app's CSS modules read `--ds-*` tokens directly, and the transitional aliases are deleted — done

Follow-ups folded into Phase 0: migrate the surviving routes from `layout.module.css` to `packages/ui` compositions — done (only `VeracandLogo.module.css` remains: SVG keyframes and per-mode logo colors). The CI job also runs the token drift check (item 5) — done.

---

## Phase 0 — Close the foundation · ~1 week

**Goal:** make the repo honest, reproducible, and verified by CI before anything else is built on it.

1. **Hygiene:** untrack `apps/api/tsconfig.build.tsbuildinfo`, `apps/web/test-results/`, and `services/ml/*.egg-info/`; ignore `*.tsbuildinfo`. Align `requires-python` with the pinned 3.12 — done.
2. **Delete placeholder routes** in `apps/web`. Keep the home page, auth screens, `/status`, and one app shell. Routes come back in the phase that fills them. The full list, the home page rewrite, and the brand rules are in [docs/ui-plan.md § Phase 0 cleanup](docs/ui-plan.md#phase-0-cleanup) — done.
3. **Local infra** in `infra/docker/compose.yml`: Postgres 16 + TimescaleDB, Redis 7. (Mongo and Mailhog join in the phases that use them.) Root scripts `pnpm infra:up` / `infra:down` — done.
4. **Env validation everywhere:** `pydantic-settings` in `services/ml`; add `CORS_ORIGINS`, `DATABASE_URL`, `REDIS_URL` to the API schema. Replace `app.enableCors()` with an allowlist — done.
5. **CI** (GitHub Actions): install, lint, typecheck, unit tests for all Node packages and `services/ml`, with Turborepo and `uv` caching. Add ruff + mypy to the ML job now — cheap while the codebase is tiny. Run `pnpm --filter @astraq/ui tokens:check`, so stale generated token files fail CI — done.
6. **Renovate** with grouped, weekly updates — done.
7. Echo `x-request-id` back in API responses — done.

**Learning focus:** reproducible environments, CI pipelines, container basics.

**Exit criteria:**

- fresh clone → `pnpm install && pnpm infra:up && pnpm dev` boots everything with no manual steps — done 2026-10-04 (web, api with migrations applied to an empty database, and ml all healthy on `/status`)
- CI is green and required on `master`
- every service crashes on invalid env
- ADR 0003: "pnpm + Turborepo, and how Python lives in the monorepo" — [done](docs/decisions/0003-pnpm-turborepo-and-python-in-the-monorepo.md)

**Kill/pivot trigger:** if CI or compose polish runs past a week, ship whatever runs and list the gaps under "Carried gaps".

---

## Phase 1 — Walking skeleton: candles end to end · ~2–3 weeks

**Goal:** one real feature from provider to deployed chart, proving every layer and contract at once.

1. **Contracts:** create `packages/shared` (Zod) and wire `nestjs-zod` + `@nestjs/swagger`. `pnpm contract` writes `apps/api/openapi.json` and regenerates `packages/sdk` (`openapi-typescript` + `openapi-fetch`); both are committed. CI fails if the committed spec or SDK drifts from the code — done ([ADR 0004](docs/decisions/0004-nestjs-openapi-generated-sdk-contract.md)).
2. **Schema (Prisma schema + Prisma Migrate; the hypertable SQL is a hand-edited `--create-only` migration):**
   - `Symbol` (ticker, name, exchange, active flag)
   - `candles_daily` hypertable: `(symbol_id, ts)` primary key, raw OHLCV, `numeric` prices
   - `corporate_actions` (split ratio / dividend, ex-date)

   Done: one `init` migration. Prisma's diff ignores the extension, the hypertable, and the CHECK constraint, so `migrate dev` reports no drift. Timescale's default `ts` index is skipped (`create_default_indexes => false`); Prisma would otherwise try to drop it.
3. **Bootstrap CLI** (`apps/api` script): fetch daily raw bars + corporate actions for a fixed list of ~20 tickers from Alpaca and upsert them. Idempotent, synchronous, no queues. Done: `pnpm --filter @astraq/api bootstrap [--tickers NVDA,AAPL]`. The Yahoo fallback was dropped: a second provider is multi-provider logic, which the kill trigger below puts in Phase 4.
4. **Endpoints:** `GET /api/symbols?query=`, `GET /api/symbols/:ticker/candles?from&to&adjustment=raw|split|all` (default `split`; `all` adds dividends for a total-return series). Adjustment is computed in SQL from raw bars + corporate actions — the first hand-written query worth being proud of. Done: a window-function running product over a hand-written exact `numeric_product` aggregate (migration `numeric_product`), no floats.
5. **Web:** `/stocks/[symbol]` renders a real `lightweight-charts` candle + volume pane from the SDK, with loading, empty, and error states. Symbol search on `/stocks`. Done: range presets (1M–Max), a custom range (`?from=&to=`, picked with `DateRangePicker`), and split-adjusted / raw prices live in the URL and render on the server; only the chart is a client component, and it repaints on theme or mode changes. Last close and day change: `GET /api/symbols` returns each symbol's latest close and the previous one, split-adjusted to the latest session's shares in SQL, and both `/stocks` results and the Today table show them. Split days are marked on raw charts: the candle response lists the splits in the range, and a line under the chart names them for screen readers. The header's price and day change come from the latest stored session, whatever the chart shows. A top-bar search lands on `/stocks`, which opens an exact ticker (or a single match) directly; the API ranks ticker matches before name matches. Page changes crossfade (`RouteTransition`, `experimental.viewTransition`); Today and Status have a `Skeleton` loading state. The chart draws in left to right on first load (the `--ds-motion-slow` token with an ease-out quint), holding its axes at the full range's bounds; it's instant under reduced motion.
6. **Deploy:** web on Vercel, api on Railway/Fly, Postgres with Timescale support. Preview deploys for web PRs. `/health/ready` really checks the database (done). Prepared ([ADR 0005](docs/decisions/0005-hosting-topology-and-timescale-availability.md), [docs/deploy.md](docs/deploy.md)): Vercel for web, Railway for the api (a multi-stage `apps/api/Dockerfile`, with migrations in the pre-deploy step) and for Postgres (the same Timescale image as compose and CI, on a private volume). Ready since: `/health` and `/status` report each build's commit (Railway's and Vercel's commit variables), every page is behind sign-in (Phase 2 sessions replaced the Phase 1 `SITE_PASSWORD` gate, resolving the public-data question in [docs/ui-plan.md](docs/ui-plan.md#decisions)), and Today renders per request instead of being prerendered at build time. Not yet: creating the projects and the first deploy.
7. Remove the `/predictions/summary` and ML `/predict` stubs — dead placeholders teach nothing. Done: both are deleted.

**Learning focus:** OpenAPI and typed clients, migrations, hypertables, composite keys, SQL window functions, RSC vs client boundaries for charts, first deployment.

**Exit criteria:**

- a deployed URL shows adjusted candles for any bootstrapped ticker
- an integration test runs the candle endpoint against real Timescale in CI (Testcontainers or a compose service) — done: `candles.repository.int-spec.ts` in the `api-integration` CI job, with a TimescaleDB service container
- a unit test proves split adjustment with a known split (e.g. NVDA 2024 10:1) — done in the same suite, since the adjustment lives in SQL
- ADR 0004: "NestJS + OpenAPI-generated SDK as the web ↔ api contract" — [done](docs/decisions/0004-nestjs-openapi-generated-sdk-contract.md)
- ADR 0005: "Hosting topology and Timescale availability" — [done](docs/decisions/0005-hosting-topology-and-timescale-availability.md)
- **product check:** I opened a candle chart on my phone from the deployed URL

**Kill/pivot trigger:** if the bootstrap starts growing retries, caching, or multi-provider logic, stop — that's Phase 4. If NestJS DI is blocking progress after two weeks, fall back to Fastify with a hand-rolled module pattern and record why.

---

## Phase 2 — Accounts, watchlists, and the first D3 view · ~3–4 weeks

**Goal:** real authentication, built once, protecting the first personal data.

No temporary auth shim: the skeleton already shows value without login, so there's nothing to migrate later. Build the auth core properly now and defer the peripheral flows to Phase 7.

1. **Auth core, hand-built:**
   - registration + login with **Argon2id**
   - short-lived JWT access token + **rotating opaque refresh token with family-based reuse detection**
   - logout and "log out everywhere"
   - web BFF stores tokens in `HttpOnly`, `Secure`, `SameSite=Lax` cookies and refreshes transparently
2. **Registration is invite-only** (env allowlist of emails) while the app is deployed without email verification.
3. **Abuse protection:** Redis-backed rate limiting on auth endpoints, CSP and security headers in the Next proxy (`apps/web/proxy.ts`).
4. **Schema:** `User`, `Session`, `RefreshToken`, `Watchlist`, `WatchlistItem`, `AuditLog`. Done: migrations `auth` and `watchlists`.
5. **Watchlists:** create, rename, reorder, add/remove symbols. Done: the api (`/api/watchlists`, ownership tested against the database) and the pages. `/watchlists` lists each list with its symbol count and creates, renames, and deletes (undo from the toast); `/watchlists/[id]` shows a row per symbol with last close, day change, and a sparkline from stored candles, adds symbols by ticker or name search, removes them (undo), and reorders them with the row's grip, all through server actions with optimistic rows. The stock page header gets "Add to watchlist". Drag to reorder is done: the row's grip drags with the pointer (rows make way as it passes their midpoints) or lifts with Space, moves with the arrows, drops with Space, and cancels with Escape, each step read out by a live region; the geometry and the moves are pure, unit-tested functions in `apps/web/lib/reorder.ts`, and both paths end in the one reorder call. Today shows a card per watchlist with the same closes, day changes, and sparklines, and the stocks opened last in this browser ([docs/ui-plan.md](docs/ui-plan.md), Today). The index names each list's best and worst movers: `GET /api/watchlists` carries them per list (`movers.best`, `movers.worst`), picked in `apps/api/src/watchlists/movers.ts` from the closes the rows already show, among the symbols whose last bar is the list's newest session, and compared exactly as fractions of integers (unit-tested); the whole index costs three queries however many lists there are. Not yet: the row-to-header morph (motion plan, Phase 6).
6. **Symbol universe:** load the full active US equity list from Alpaca into `Symbol` so search covers everything; candles for a newly watched symbol are fetched on demand by the bootstrap path. Done: `pnpm --filter @astraq/api symbols:sync` loads Alpaca's active, tradable US equities on a listed exchange (OTC left out: no bars on the free plan) in one `unnest` upsert and deactivates what the provider no longer lists; adding a symbol to a watchlist loads its history inline through the bootstrap service when the api has Alpaca keys (one load per symbol at a time, failures logged, the watch succeeds either way); `bootstrap --tickers` accepts any synced ticker; search without a query lists only the symbols that have candles. Not yet: a scheduled resync (Phase 4 jobs) and loading candles from the stock page itself.
7. **First D3 view — returns distribution** (`/analysis/returns?symbol=&from&to`), pulled forward from Phase 6 so the visualization goal starts early. It needs only stored candles:
   - `GET /api/symbols/:ticker/returns?from&to`: daily returns from adjusted closes with `lag()`, plus summary stats (mean, standard deviation, skew, best and worst day, share of up days) in the same SQL query. Done: `adjustment` defaults to `all` (an ex-dividend day is not a loss), the range bounds the returns so the first day in it still has one, the stats come back as one row with the series packed by `json_agg`, and the adjustment CTEs are shared with the candles query as `Prisma.sql` fragments. Checked against a hand-computed fixture across a split and a dividend (`candles.returns.int-spec.ts`).
   - a histogram with a normal-curve overlay, hand-built with `d3-scale`, `d3-array` (`bin`), and `d3-shape`. React renders the SVG; D3 only computes scales, bins, and paths. Colors come from the `chart-*` tokens. Done: `histogramLayout` in `apps/web/lib/returns-view.ts` is a pure, unit-tested function (bins of about 1.5 √n with nice edges, the normal density scaled to day counts, a mean marker); `ReturnsHistogram` maps it to SVG
   - hovering a bar shows its range and day count; the stats sit beside the chart as a table, so the numbers don't depend on the visual. Done: hover and focus report the bucket in a live caption; `ReturnStatsTable` shows the api's figures
   - linked from the stock page header and a watchlist row. The sidebar gets **Analysis**, pointing at this view until Phase 6 adds the index. Done: `/analysis/returns?symbol=&range=|from=&to=&adjustment=all|split`, with the range presets and date picker shared with the stock chart, a "Returns" button in the stock page header, a chart icon on each watchlist row, and **Analysis** in the sidebar
8. **Command palette and keyboard shortcuts** (the Phase 2 rows of [docs/ui-plan.md § App shell](docs/ui-plan.md#app-shell) and the motion plan). Done: the top bar's search box opens a ⌘K / Ctrl+K palette, a `Dialog` holding an inline Base UI `Combobox`, that lists pages, symbols (the api's search through the existing server action, debounced), actions (light/dark mode, next theme, new watchlist, the shortcut overlay, sign out), and the last six places opened from it (localStorage, read through `useSyncExternalStore`). Ranking is hand-built in `apps/web/lib/command-palette.ts`: a label prefix beats a word start, which beats a run inside a word, which beats scattered letters; hints and keywords count after the label. `apps/web/lib/shortcuts.ts` is the one list of shortcuts and a pure sequence matcher: `/` opens the palette, `?` the shortcut overlay, `g` then a letter jumps to a sidebar page (the letter sits beside each item in `lib/navigation.ts`), and the prefix expires after a second. Plain keys stay quiet inside fields, dialogs, and menus; Mod+K works everywhere. Every shortcut shows in the palette rows and in the overlay, with ⌘ or Ctrl by platform. Both helpers are unit-tested.
9. **User menu, theme menu, and Settings** (the last Phase 2 rows of [docs/ui-plan.md § App shell](docs/ui-plan.md#app-shell) and [§ Settings](docs/ui-plan.md#settings--settings)). Done: `GET /api/me`, `PATCH /api/me` (a display name, migration `account_name`), `GET /api/me/sessions` (the live sessions, newest first, the request's own marked, last use dated by the newest refresh token), and `DELETE /api/me/sessions/:id`, scoped by user id in the repository like the watchlists and covered by a controller spec. The top bar gets the theme menu (mode, theme, density as radio groups, in both shells) and the user menu (initials avatar; Settings, the shortcut overlay, Sign out). `/settings` shows the profile (name form, read-only email, member since) and `/settings/sessions` the devices, with sign-out per device and "Log out everywhere" behind a confirmation. **Settings** joins the sidebar (`g e`). Not yet (Phase 7): Security and API keys.

**Learning focus:** password hashing, token rotation, session security, cookie semantics, CSRF/CORS, rate limiting, authorization at the repository layer, SQL window functions, D3 scales and generators inside React.

**Exit criteria:**

- register → login → refresh → logout works end to end on the deployed app
- reuse of a rotated refresh token revokes the whole family (integration-tested)
- users cannot read or modify another user's watchlist (tested at API level)
- a unit test checks the returns query's stats against a hand-computed fixture
- ADR 0006: "Refresh-token rotation and reuse-detection design" — [done](docs/decisions/0006-refresh-token-rotation-and-reuse-detection.md)
- ADR 0007: "Chart composition: lightweight-charts for time-axis charts, D3 for the rest, and how D3 lives in React" — [done](docs/decisions/0007-chart-composition.md)
- **product check:** I keep my real watchlist in Veracand and stay logged in on my phone, and I've read the returns distribution of a stock I own

**Kill/pivot trigger:** if the auth core isn't stable after three weeks, ship without "log out everywhere" and fine-grained rate limits. Rotation and reuse detection are non-negotiable. Auth comes first: if the returns view would push the phase past four weeks, move it back to Phase 6 and note it under "Carried gaps".

---

## Phase 3 — Paper trading and portfolio accounting · ~3–4 weeks

**Goal:** a portfolio whose numbers you would bet on, and the tracing to prove it.

1. **Fill model ADR first.** It will be shared with the backtester in Phase 5:
   - market orders placed outside market hours fill at the next session's open
   - market orders during the session fill at the latest known price (latest daily close until realtime exists), plus configurable slippage
   - limit orders fill when a bar's range crosses the limit
   - commissions are configurable per portfolio

   Done: [ADR 0008](docs/decisions/0008-fill-model-shared-by-paper-trading-and-backtesting.md), and the model itself as two pure functions over decimal strings (`apps/api/src/trading/fill-model.ts`): `fillOnBar` for an order against a session's bar and `fillAtLastPrice` for a market order mid-session. A limit order the open has already passed fills at the open, capped at the limit; otherwise it fills at the limit only when the session trades through it (a touch doesn't fill). Slippage is basis points against the trader, on market-priced fills only. The cases in `packages/shared/fixtures/fill-model.json` are the contract the Python port must reproduce in Phase 5. Nothing calls the model until item 3.
2. **Ledger-based accounting, hand-built:** every cash and position change is an immutable ledger entry; balances and positions are *derived*. Realized PnL uses FIFO lots (average cost can come later). Done ([ADR 0009](docs/decisions/0009-ledger-accounting-and-order-transaction-boundaries.md)): double entry over five accounts (cash, securities at cost, capital, fees, realized PnL), where every transaction's entries sum to zero. `apps/api/src/ledger/ledger.ts` is pure: `replay` folds a history into cash, lots, and realized PnL and refuses one that doesn't add up (a sell's stored cost must be its FIFO cost), and `deposit`, `withdrawal`, `buy`, and `sell` build the next transaction or refuse it (no overdraft, no short selling). A partly sold lot keeps the cents it hasn't handed out, so partial sells never lose one. Arithmetic is a hand-built exact decimal on `bigint` (`common/decimal.ts`). Migration `ledger` adds `portfolios`, `ledger_transactions`, and `ledger_entries`; triggers make the ledger append-only and refuse an unbalanced transaction at commit. Postings are written under a row lock on the portfolio, so concurrent postings can't overdraw or fork the history (integration-tested; since 2026-11-16 the one write path is `OrdersRepository.transact`). Not yet: endpoints and pages (items 3 and 6), dividends and splits (item 4).
3. **Order lifecycle:** `Portfolio`, `Order`, `Fill`, `Lot`, `LedgerEntry`. Place, cancel, fill. **Idempotency keys** on order placement. Done (api; [ADR 0009](docs/decisions/0009-ledger-accounting-and-order-transaction-boundaries.md) section 7): `/api/portfolios` creates a portfolio with its starting cash and trading costs, returns its books (cash, positions at cost, realized PnL, fees, dividends), and takes deposits and withdrawals; `/api/portfolios/{id}/orders` places, lists, and cancels orders. Migration `orders_corporate_actions` adds `orders` and `fills`. An order is `open`, then `filled`, `cancelled`, or `rejected`. A market order placed during the session fills at once at the last stored close; every other order waits for the first daily bar whose session opened after it was placed. The rules are pure functions (`apps/api/src/trading/settlement.ts`): the repository locks the portfolio's row, reads the ledger, open orders, bars, and corporate actions, lets `settle`, `place`, or `cancel` decide, and writes the order, its fill, and the ledger transaction in one database transaction. Placement requires an `Idempotency-Key` header, looked up under that lock: the same key returns the first order, and the same key with a different order is a 409. Nothing runs on a schedule yet, so a portfolio settles when it is read or written; settling twice writes nothing. A deposit or withdrawal goes through the same path and settles first (`transfer` in `settlement.ts`), so cash moved today can't pay for, or be taken from under, a fill that already happened. Since item 5 an order is also checked when it is placed, and the session clock reads the exchange calendar. Not yet: the Orders tab and the order ticket (item 6).
4. **Corporate actions:** applying a split adjusts open lots. Dividends credit cash on the pay date. Done ([ADR 0009](docs/decisions/0009-ledger-accounting-and-order-transaction-boundaries.md) section 8), as part of settlement. A split converts every lot bought before its ex-date (shares × to / from, cost unchanged) with one ledger entry that moves no money, cancels the orders placed before it, and divides the last close a market order fills at on the ex-date. A dividend is booked on its ex-date as income and a receivable, for the shares bought before that day, and becomes cash on its pay date (`corporate_actions.pay_date`, now loaded from Alpaca; the ex-date when the provider gives none). The ledger gained the kinds `split`, `dividend`, and `dividend_payment` and the accounts `dividends_receivable` and `dividend_income`. Limit: an action loaded after the fact is applied late (a dividend whose shares were already sold is missed), which Phase 4's ingestion closes.
5. **Risk rules:** market-calendar awareness (Alpaca calendar), max order notional, insufficient-cash and short-selling guards. Done ([ADR 0009](docs/decisions/0009-ledger-accounting-and-order-transaction-boundaries.md) section 9), in two slices:
   - **Guards at placement** — done: `assess` in `apps/api/src/trading/risk.ts` (pure) refuses a sell of more shares than are held and not promised to open sell orders, an order over the portfolio's `maxOrderNotional` (new, set at creation, null for no limit), and a buy the cash doesn't cover after what open buy orders are expected to take. A market order is estimated at the latest close with slippage and a limit order at its limit, both through the fill model (`fillAtLimit` is new). A refusal is a 422 whose detail says why, and the order isn't stored. `POST .../orders/preview` runs the same function (`preview` in `settlement.ts`) and returns the timing, the session it fills in, the estimate, the cash after, and the refusal. Both run under the portfolio's lock after settling. The check at the fill stays: prices move between the two.
   - **Exchange calendar** — done: migration `risk_rules` adds `market_sessions` (and `portfolios.max_order_notional`). `calendar:sync` loads Alpaca's calendar from 2016 to the end of next year, and `MarketCalendarService` reloads the year ahead when less than a week is stored. `isRegularSession` and the new `nextSession` in `market-hours.ts` take the calendar as a value and fall back to the weekday rule for a date it doesn't cover. Not yet run against the live Alpaca endpoint (no keys on the machine it was built on): the response shape is the documented one.
6. **Portfolio screens:** holdings, cash, realized/unrealized PnL, equity curve, orders and fills — the `/portfolios` routes and the order ticket in [docs/ui-plan.md](docs/ui-plan.md). In slices, each a page with real data:
   - **Positions priced (api)** — done: `GET /api/portfolios/{id}` returns each position's `lastPrice`, `priceDate`, `marketValue`, and `unrealizedPnl`, and the portfolio's `marketValue`, `unrealizedPnl`, and `equity`. The price is the latest stored close in the shares that trade today (a split that has gone ex after that bar is applied in SQL), and the sums are pure functions (`trading/valuation.ts`). A position without a bar has no price, and then the totals are null rather than partial.
   - **`/portfolios` and Holdings** — done: the list with each portfolio's equity, cash, and total return, and the form that creates one; `/portfolios/[id]` with the figures, the positions table (cash as its last row), and deposits and withdrawals; **Portfolio** in the sidebar, the palette, and `g p`. The web does one piece of money arithmetic, equity less capital for the total return, in whole cents on `bigint` (`apps/web/lib/money.ts`). With one portfolio `/portfolios` opens it directly.
   - **Orders tab and the order ticket:** place, list, cancel, with the preview and inline guards from item 5's endpoint. Next.
   - **Activity tab:** needs `GET .../activity` (the ledger as a timeline) and lots per position.
   - **Equity curve and day PnL:** needs the ledger replayed against each session's closes; the last slice, and the first `d3` or `lightweight-charts` view of the user's own money.
7. **Tracing:** OpenTelemetry in `apps/api` and the web BFF, with a span per order placement and propagation web → api → database. Local Jaeger in compose.
8. **Backups:** automated nightly Postgres backups on the host — paper trades are now data worth keeping.

#### Audit follow-ups

What the 2026-11-16 review found is fixed (see the revision log). One thing is left, and it needs a browser:

- **Keyboard reorder** (`lib/use-reorder.ts`, used by `WatchlistItemsTable.tsx`): a lifted row that moves down is re-inserted in the DOM and loses focus. The grip now takes focus back after every step, and a blur cancels the lift only if it sticks. Written from the code, not yet tried with a keyboard: lift a row with Space, press ArrowDown twice, drop it, and check a drag with the pointer still works.

Not reviewed in that pass: `packages/ui`, `services/ml`, the CI workflow, and the Docker files.

**Learning focus:** transactions and isolation levels, invariants, double-entry thinking, decimal math, idempotency, instrumentation.

**Exit criteria:**

- property-based tests (fast-check) prove invariants: cash + market value reconciles with the ledger, no negative positions without short permission, and replaying the ledger reproduces the state — done for the ledger itself (`ledger.spec.ts`: cash plus shares at cost plus dividends owed equals capital plus realized PnL and dividend income less fees after every step, across random buys, sells, splits, and dividends; nothing goes negative; and replay rebuilds the state); market value joins when positions are priced (item 6)
- concurrent duplicate order submissions with the same idempotency key produce exactly one order (integration test against real Postgres) — done (`orders.int-spec.ts`: ten concurrent placements, one order, one fill, one ledger transaction)
- a split on a held symbol leaves the portfolio's market value unchanged — done at cost and share count (`ledger.spec.ts`, `settlement.spec.ts`, `orders.int-spec.ts`: ten times the shares, the same cost, a tenth of the price); the priced figure joins with item 6
- every order is traceable from browser request to SQL statement
- ADR 0008: "Fill model shared by paper trading and backtesting" — [done](docs/decisions/0008-fill-model-shared-by-paper-trading-and-backtesting.md)
- ADR 0009: "Ledger accounting and order transaction boundaries" — [done](docs/decisions/0009-ledger-accounting-and-order-transaction-boundaries.md), including the order boundary (section 7) and corporate actions (section 8)
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
7. **MongoDB enters:** an append-only archive of raw provider responses (schema varies by provider and version, TTL index, replayable into the normalizer), accessed through a second Prisma client (MongoDB connector). Add Mongo + Mongo Express to compose.
8. Bull Board (or equivalent) behind admin auth to inspect queues.

**Learning focus:** adapter pattern, contract testing, queue design, retry semantics, data quality, time-series storage policies, document modeling.

**Exit criteria:**

- any watched symbol stays fresh automatically for two weeks with no manual action
- replaying one archived raw payload reproduces the stored bars exactly
- ADR 0010: "Provider contract and failure modes"
- ADR 0011: "MongoDB vs Postgres JSONB for the raw payload archive" — if JSONB wins, drop Mongo and say so
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
- ADR 0012: "Strategy DSL shape and versioning"
- ADR 0013: "Bias guards in the backtest engine"
- **product check:** a strategy I care about has been running on a paper portfolio for two weeks

**Kill/pivot trigger:** if the DSL design runs past a week without a backtest running, freeze it at SMA crossover + RSI threshold and move on.

---

## Phase 6 — Analysis dashboard and research journal · ~3 weeks

**Goal:** make Veracand the tab you open every morning.

1. **Symbol page upgrade:** multi-pane layout with synced crosshairs, indicator overlays (EMA/SMA/Bollinger), RSI/MACD panes, markers for your fills and strategy signals.
2. **Analysis views:** an `/analysis` index, watchlist performance table, relative performance comparison, drawdown chart, seasonality heatmap (`d3`). The returns distribution already shipped in Phase 2.
3. **Saved chart layouts** (Postgres `JSONB` — relational ownership, flexible payload).
4. **News per symbol** from a free source into MongoDB, shown on the symbol page.
5. **Research journal:** notes attached to a symbol, trade, or backtest run, with tags and full-text search. Use Mongo or Postgres per the Phase 4 ADR.
6. Mobile layout pass across all core pages.

**Learning focus:** chart performance, visualization design, progressive hydration, document modeling, full-text search.

**Exit criteria:**

- core pages are usable at phone and desktop widths
- symbol page interaction stays under 100 ms on 10 years of daily bars (measured)
- the chart split from ADR 0007 still holds, or ADR 0007 is amended with the measurements
- **product check:** Veracand replaced one daily habit (finviz, TradingView lite, a spreadsheet)

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
- ADR 0014: "2FA and API-key design"
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
- ADR 0015: "Time-series validation strategy"
- **product check:** I read a forecast band on a chart I care about and can say whether it beats naive

**Kill/pivot trigger:** if four weeks pass without a model beating naive out of sample, ship the volatility bands (GARCH) and the harness — an honest "no edge" result is a valid outcome.

---

## Phase 9 — Realtime and alerts · ~3–4 weeks

**Goal:** make Veracand feel alive without making it fragile.

1. **`services/ingest`** (Python): Alpaca websocket (IEX) for watched symbols → Redis Streams, with reconnects, heartbeats, and gap backfill.
2. Intraday bars (1-minute hypertable + continuous aggregates). Paper-trading fills move to latest-trade price during the session.
3. **Live updates over SSE** (simpler than websockets for one-way data): latest price, portfolio PnL, triggered alerts.
4. **Alerts:** price and indicator conditions, strategy signals; delivered in-app, by email, and optionally by Telegram. Deduplicated with cool-downs.
5. Optional second adapter: Binance for 24/7 crypto, exercising the calendar abstraction.

**Learning focus:** streaming trade-offs, backpressure, reconnection logic, event-driven UI, operational safety.

**Exit criteria:**

- ingest survives a full trading week including a forced restart, with gaps backfilled automatically
- alerts arrive within 60 seconds of the triggering condition
- ADR 0016: "Redis Streams + SSE for this scope"
- **product check:** an alert changed what I did that day

**Kill/pivot trigger:** if ingest can't stay up for a week, fall back to 5-minute polling and keep alerts.

---

## Phase 10 — Operate: observability, performance, reliability · ~3 weeks

**Goal:** run Veracand like a small production system. There's real traffic by now, so the dashboards mean something.

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
- ADR 0017: "SLOs and what they protect"
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
| Frontend and visualization | Phase 1 (first chart), Phase 2 (first D3 view), Phase 6 (dashboard), Phase 9 (live UI) |
| Operations | Phase 0 (CI), Phase 1 (deploy), Phase 3 (tracing), Phase 10 (SLOs, DR) |

**Estimated total:** roughly 35–41 weeks at 10–12 hours/week for Phases 0–10. Re-estimate at the start of every phase.

---

## Revision log

**2026-11-17 — Portfolio pages; risk rules (Phase 3 item 6, second slice, and item 5).** The first pages over the paper-trading api, and the two things the api still lacked before an order ticket could be honest. Decisions the roadmap left open, recorded in ADR 0009 section 9: the guards at placement work from an estimate (the latest close with slippage, or the limit) and the ledger's check at the fill stays; open buy orders hold their estimated cash and open sell orders free nothing; a refusal is a 422 and leaves no order behind, so `rejected` still means "refused at its fill"; the limit per order is on the notional and is set when the portfolio is created; the preview is the same function as the guard. The calendar is passed to the session clock as a value, and a date it doesn't cover keeps the weekday rule, so a database without it still trades. Item 5's two slices were done together, ahead of the Orders tab, because the ticket needs the preview. On the web, "Portfolio opens the last one you used" became "opens the only one, or the list": nothing remembers a last-used portfolio yet. `apps/web/tsconfig.json` targets ES2020 (was ES2017) for `bigint` literals; it only type-checks, Next compiles separately.

**2026-11-16 — Phase 0 to 3 audit; positions priced; status block restructured.** A review of the whole codebase against this file. Fixed in the api: a deposit or withdrawal was posted without settling the portfolio first, so cash moved today could pay for an order that had met its bar days earlier, or be withdrawn from under one (cash moves now go through `OrdersRepository.transact` like everything else, ADR 0009 section 7); a portfolio whose owner had withdrawn gains answered 500 from then on, because `capital` goes negative and the response schema didn't allow it; a logout sent with a still-valid access token overwrote a `REUSE_DETECTED` revocation; two registrations racing for one email gave a 500; a zero close before a dividend's ex-date divided by zero in every candle query for the symbol; and a response that fails its own schema now logs which fields failed. Fixed in the web: `/stocks/123` showed "the chart couldn't load" instead of a 404, and the manifest sat behind the session gate. Added: the first slice of item 6, positions and equity at the latest close. Plan: the status block became a table and lists (it had grown into three paragraphs nobody could scan), items 5 and 6 of Phase 3 are cut into slices, and what the review found but didn't fix is listed under Phase 3's "Audit follow-ups". The first deploy is named as the next step: three phases are waiting on it.

**2026-11-16 — Phase 0 to 2 refactor, on the same branch.** The follow-ups the audit listed for the first three phases, done. No endpoint or page changed shape; `openapi.json` is the same. **Web:** every server action answers with one `ActionResult` and shares its failure steps (`lib/action-result.ts`: the settings actions had their own, differently shaped); the six browser calls to the BFF's auth routes go through `lib/auth-client.ts`, so a dropped connection is a message instead of the error boundary or nothing; symbol suggestions are one hook (`lib/use-symbol-suggestions.ts`) over an action that reports failure, so a search that can't reach the api no longer reads "nothing matches" in the palette and the add-symbol box; the two localStorage stores share `lib/local-store.ts`; range parsing and its query string are shared by the stock and returns pages; the quote cells of three tables are one `QuoteCells`; a day change has the price's precision (a sub-dollar move no longer reads `+0.00`), the watchlist movers reuse `DayChange`, and the chart's readout formats its prices; the sign-in and registration route handlers validate the body before forwarding it, as does the undo of a removed symbol; and the keyboard reorder keeps focus on the row it moves (to confirm in a browser). The `QueryClientProvider` nothing used is gone with its dependency; the stack table says when TanStack Query comes back. **Api:** `decimalString`, the signed one, and the one-line name live once in `packages/shared/src/primitives.ts`; a ticker is resolved in one place (`symbols/resolve-ticker.ts`), `SymbolsModule` exports its repositories instead of each module providing its own, and a watchlist reorder looks its tickers up in one query instead of one per row; the movers compare on `common/decimal.ts` instead of a second scaled-integer implementation; the Alpaca mapper reads the New York calendar through `market-hours.ts` like settlement does; enum case conversion (`common/enum-case.ts`) and the unique-violation check (`common/prisma-errors.ts`) are shared; refresh-token rotation creates the child token in one place.

**2026-11-16 — The rest of the refactor list, all phases.** What the review had left for later, done on the same branch. **Api:** a ledger has one write path: `LedgerService` and `LedgerRepository.append` are deleted, and the ledger's integration test posts through `OrdersRepository.transact` (ADR 0009 section 7 amended). Repositories raise domain errors that know nothing about HTTP (`common/domain-errors.ts`: `NotFoundError`, `ConflictError`), and the exception filter gives each kind its status, so the per-service `run()` wrappers and try/catch blocks that turned them into `NotFoundException` and `ConflictException` are gone (the convention is in `apps/api/AGENTS.md`). "Sign this device out" and logout are one revocation (`AuthRepository.revokeSession`). `OrdersRepository.snapshot` loads bars, the last bar, and corporate actions through three small methods, ahead of item 5's placement guards. **Web:** drag and keyboard reordering is a hook (`lib/use-reorder.ts`), and `WatchlistItemsTable.tsx` is down from about 400 lines to about 220; the palette's search box and results are `PaletteSearch.tsx`; number formatting is `lib/format.ts`; the range presets and date picker are one `RangeControls` on both pages that have a range; and "the session ended since the page rendered" is one `requireSession` check.

**2026-11-13 — Orders and corporate actions (Phase 3 items 3 and 4).** The first endpoints under `/api/portfolios`, api only: the screens are item 6. Decisions the roadmap left open, recorded in ADR 0009 sections 7 and 8: portfolios settle when read or written until a job exists; an order the ledger refuses at its fill is rejected, and checking at placement stays with the risk rules (item 5); a split cancels the orders placed before it; a dividend is income and a receivable on the ex-date and cash on the pay date, which added two ledger accounts; orders have no time in force. The session clock knows weekends only until the exchange calendar arrives (item 5), recorded under "Not yet real". `corporate_actions` gained `pay_date`; a rerun of the bootstrap fills it for stored dividends.

**2026-11-12 — Phase 3 starts: fill model and ledger (items 1 and 2).** Phase 2 is code-complete and its exit waits on the deployment, so Phase 3 begins with the two items that need neither a deploy nor a page; the gap is recorded in the status block. The fill model is decided (ADR 0008) and built as pure functions with a shared fixture file, ahead of the code that will call it. Two readings of the roadmap's rules were made stricter: a limit order fills only when the bar trades through it, and slippage rounds against the trader. The ledger is double entry (ADR 0009) and derives everything by replay; `fast-check` joins the api's dev dependencies for its property tests. The migration also creates `portfolios`, which item 3 was going to add, because the ledger needs an owner.

**2026-11-12 — Watchlist movers (Phase 2 item 5); two fixes to the audit branch.** The watchlist index shows each list's biggest gain and biggest loss of its latest session, the last open row of the Watchlists plan. A symbol whose last bar is older than the list's newest session is left out, so a delisted symbol's final day isn't a mover forever. Checking the audit fixes found two gaps in them: "Log out everywhere" from an idle tab refreshed the session first, and when the api then failed to revoke, the response dropped the new token pair, so the browser's next request sent a spent refresh token and reuse detection signed the user out; the pair is now set on that response. And sessions recorded the web server's address as the device's, since only the rate limiter read the address the BFF vouches for; sign-in and registration record it too (`clientAddress`).

**2026-11-11 — Phase 2 audit fixes; Today's watchlist summary.** A review of Phase 2 found the api's rate limits written in seconds where the throttler reads milliseconds (so none applied), a sign-out from an idle tab that revoked nothing, and an api restart that signed everyone out; all three are fixed, along with a reorder racing an add, `adjustment=raw` on the returns endpoint, the missing Alpaca timeout, and server actions that lost the api's error messages. Today now shows the user's watchlists and recently viewed stocks, the last open Phase 2 row of the Today plan. A second pass closed what the review had left: rate limits count per browser (the web server vouches for the client address with `BFF_SHARED_SECRET`; before, every user would have shared the web server's bucket once deployed), a pointer drag no longer ends at the first swap downwards, `/forgot-password` is removed until Phase 7, the histogram's bars are one tab stop walked with the arrow keys, the production CSP drops `unsafe-eval`, and prices render with at least two decimals.

**2026-11-10 — User menu, Settings, drag to reorder (Phase 2 item 9; watchlists item 5).** The first endpoints under `/api/me`, and the first Settings pages. "Log out everywhere" moved from an api-only endpoint to a button. The sidebar gains Settings. The watchlist rows lose their up and down arrows for a grip that drags or lifts.

**2026-11-10 — Command palette and keyboard shortcuts (Phase 2 item 8).** The top-bar symbol search became the palette's trigger; `packages/ui` gained two small options for it: `DialogContent` can keep its title for assistive technology only and drop its close button, and `ComboboxInput` can hide its chevron for an `inline` list. The create-watchlist form focuses its name field when opened as `/watchlists#new`, the palette's "New watchlist".

**2026-11-02 — Watchlist pages; auth BFF tidy-up.** The web talks to the api as the user through `lib/api.ts`'s `userApi()`, which puts the session cookie's token on a per-request SDK client (`createApiClient` now takes openapi-fetch options). Writes are server actions in `app/(app)/watchlists/actions.ts`, validated with the shared Zod schemas before they reach the api. While there: the sign-in and registration route handlers share `lib/auth-bff.ts` (they were copies), the cookie pair is set and cleared in one place (`setAuthCookies` / `clearAuthCookies`), the `problemDetail` reader lives beside the client, and `middleware.ts` is `proxy.ts`, the Next 16 name for the same file. `ToastProvider` is mounted at the root for the undo toasts.

**2026-10-19 — Phase 0/1 refactor, second pass.** The web gets `lib/dates.ts`, the twin of the api's `common/dates.ts`: the chart's time stamps, the range presets, and the `?from=&to=` check share its three functions instead of each spelling out `T00:00:00Z`. Today and Stocks render one `NoSymbolsLoaded` state. The symbols service passes the search query through as is, since the repository already treats an empty one as "list all". README's env table says what an unset `ML_URL` means in production.

**2026-10-12 — Phase 0/1 audit.** Checked the code against the status block. One claim wasn't true: `/stocks` never opened an exact ticker or a lone match; it does now. Cleanup: dependencies nothing used are gone (Stripe, `dayjs`, `@tanstack/react-table` in web; `express` 4, `cors`, `ts-node` in the api, whose express 4 pin sat beside Nest 11's express 5), along with the scaffold SVGs in `apps/web/public`. The web makes one SDK client (`lib/api.ts`), the market-data repository no longer imports its date type from the Alpaca client, and api unit-test hooks get 30s, because a Nest testing module could miss the 10s default under a full `turbo run`. Deploy readiness: with `ML_URL` unset in production, `/status` lists ML as not deployed instead of down, so a healthy deploy reads "All services up" (ADR 0005 amended); `robots.txt` disallows everything and is served outside the password gate, and the sitemap is gone until a page is public. Verified locally: the api image migrates a fresh TimescaleDB with `prisma migrate deploy`, passes `/health/ready` with its commit, and refuses to boot in production without `DATABASE_URL` and `CORS_ORIGINS`; the production web build serves the gate, `/status`, and the search redirect.

**2026-10-03 — Prisma everywhere on the Node side.** Prisma is the single database toolkit in `apps/api`: Client, Migrate (including the hand-edited TimescaleDB migrations), TypedSQL for raw queries, and seeding. MongoDB in Phase 4 uses Prisma's MongoDB connector instead of Mongoose. `services/ml` is the one exception, because Prisma has no maintained Python client: it reads Postgres with a plain SQL driver and never owns the schema.

**2026-10-03 — product renamed from Forelume to Veracand.** forelume.com turned out to be an existing paid crypto trading-signals business (TradingView indicators, Discord alerts) with the tagline "Light Before The Move": the same name, the same field, and a concept close to the old "light ahead" logo story. The rename happened before any deployment or domain. "Veracand" (*vera* + *cand(le)*: the true candle) had no `.com`, `.app`, or `.dev` registration and no finance or trading use in a web search on that date; a formal trademark search (USPTO, EUIPO; classes 9, 36, 42) is still to do before Phase 1 deploys. Everything followed: UI copy and metadata, the logo component, the flagship theme id and its storage keys, the local Postgres user and database, the compose project, the ML package (`veracand-ml`), and the docs. The repo name and the `@astraq/*` scope stay. The mark was redrawn to fit the name: a V whose rising arm runs into a candlestick (the true candle), with the gold spark kept as the forecast target. `app/favicon.ico`, until then the Next.js scaffold default, is now generated from the same geometry as `lib/brand-icon.ts`.

**2026-10-03 — first D3 view pulled forward; ADRs renumbered.** The returns distribution moves from Phase 6 to Phase 2, so the creative-visualization goal starts months earlier with a view that needs only stored candles. The chart composition ADR moves with it (now ADR 0007). ADR 0003 went to the pnpm + Turborepo decision in Phase 0, so every later ADR shifts: the contract ADR is now 0004 and the rest follow in order.

**2026-10-02 — design system v2 done.** All 7 plan PRs and the alias follow-up are merged; `@astraq/ui` is versioned `0.2.0`. The token drift check joins the Phase 0 CI item.

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
