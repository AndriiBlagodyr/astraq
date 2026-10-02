# UI Plan — Pages, Navigation, and Home

What the web app shows, where it lives, and when each page ships. It pairs with the [ROADMAP](../ROADMAP.md), which says what each phase builds, and the [motion plan](motion-and-delight-plan.md), which says how it moves. Components come from `@astraq/ui` ([design-system-plan.md](design-system-plan.md)). Page composition and trading patterns stay in `apps/web`.

## Principles

1. **The menu follows the core loop:** watchlist → chart → strategy → backtest → paper trade → review. Every page is a step in that loop or supports one.
2. **A page ships with its phase, never before.** No placeholder routes, mock charts, or sample metrics. A menu item appears in the phase that gives it real data.
3. **The stock page is the hub.** Everything about one symbol (chart, backtests, notes, news, forecasts) is a tab on `/stocks/[symbol]`, not a separate section.
4. **Honest numbers.** A result always shows its context: backtests next to buy-and-hold, forecasts next to their out-of-sample score, prices with their as-of time.
5. **The URL is the state.** Tabs, filters, date ranges, and sort orders live in the path or search params, so any view can be bookmarked, shared, or reopened.

## Navigation

### App shell

A sidebar on desktop, plus a top bar.

| Group | Item | Route | Phase |
|---|---|---|---|
| — | **Today** | `/` | 1 |
| Markets | **Watchlists** | `/watchlists` | 2 |
| Markets | **Stocks** | `/stocks` | 1 |
| Trading | **Portfolio** | `/portfolios` | 3 |
| Trading | **Strategies** | `/strategies` | 5 |
| Trading | **Backtests** | `/backtests` | 5 |
| Research | **Analysis** | `/analysis` | 6 |
| Research | **Journal** | `/journal` | 6 |
| Research | **Alerts** | `/alerts` | 9 |
| Bottom of sidebar | **Settings** | `/settings` | 2 |
| Bottom of sidebar | **Status** | `/status` | 0 (admin-only from 7) |

- A group header appears only once it has an item. Until Phase 3 the sidebar is Today, Watchlists, Stocks, and Status.
- **Top bar:** symbol search (Phase 1), which becomes the ⌘K / Ctrl+K command palette in Phase 2 (pages, symbols, actions, recent items). After that come the theme menu (theme, mode, density) and the user menu (Settings, Sign out; Phase 2).
- **Keyboard:** `/` focuses search, `g` + a letter jumps to a page, `?` lists the shortcuts (Phase 2, motion plan).
- **Phone (Phase 6 mobile pass):** a bottom tab bar with Today, Watchlists, Portfolio, and Search. The rest live in a "More" sheet (`Drawer`).

### Public shell

Phase 2 onward, for visitors who aren't signed in: the logo, Sign in, and the theme menu. No product menu, because there's nothing public to browse.

### Removed from the current app

- **Market Data** merges into Stocks; data health moves to Status.
- **Predictions** and **Experiments** stop being sections. Forecasts are an overlay and a tab on the stock page (Phase 8), and ML signals become strategy rules.
- **`/stocks/[symbol]/compare`, `/custom`, `/tradingview`** go away. Comparison becomes `/analysis/compare`, and the chart has one implementation (`lightweight-charts`).

## Route map

| Route | Page | Phase | Access |
|---|---|---|---|
| `/` | Today (signed in) / Landing (signed out) | 0 → 1 → 2 | public until 2, then split |
| `/login` | Sign in | 2 | public |
| `/register` | Create account (invite-only) | 2 | public |
| `/forgot-password`, `/reset-password` | Password reset | 7 | public |
| `/verify-email` | Email verification | 7 | public |
| `/stocks` | Stock search and browse | 1 | public until 2, then signed in |
| `/stocks/[symbol]` | Stock page — Chart tab | 1 | same |
| `/stocks/[symbol]/backtests` | Stock page — Backtests tab | 5 | signed in |
| `/stocks/[symbol]/notes` | Stock page — Notes tab | 6 | signed in |
| `/stocks/[symbol]/news` | Stock page — News tab | 6 | signed in |
| `/stocks/[symbol]/forecast` | Stock page — Forecast tab | 8 | signed in |
| `/watchlists`, `/watchlists/[id]` | Watchlists | 2 | signed in |
| `/portfolios` | Portfolio list | 3 | signed in |
| `/portfolios/[id]` | Portfolio — Holdings | 3 | signed in |
| `/portfolios/[id]/orders` | Portfolio — Orders | 3 | signed in |
| `/portfolios/[id]/activity` | Portfolio — Activity (fills, cash, dividends) | 3 | signed in |
| `/strategies`, `/strategies/new`, `/strategies/[id]` | Strategies | 5 | signed in |
| `/backtests`, `/backtests/[id]` | Backtests | 5 | signed in |
| `/analysis/*` | Analysis views | 6 | signed in |
| `/journal`, `/journal/[id]` | Research journal | 6 | signed in |
| `/alerts` | Alerts | 9 | signed in |
| `/settings/*` | Settings | 2, 7 | signed in |
| `/status` | System and data status | 0, 4 | public until 7, then admin |
| `/admin/users` | User admin | 7 | admin |

## Pages

Each page lists what it's for and what it does in each phase. Every data page has a `loading.tsx` with `Skeleton`, an empty state (`EmptyState` with one action), and an error state with a retry.

### Today — `/`

**For:** the page you open every morning. It answers "what changed since I last looked?"

| Phase | Adds |
|---|---|
| 0 | No data yet. A short text page: what Astraq is and what's being built. No mock charts or metrics. |
| 1 | Symbol search, plus a table of the bootstrapped tickers (~20) with last close, day change, and as-of date, each linking to its chart. |
| 2 | Watchlist summary: each watchlist's symbols with sparklines and day change. Recently viewed stocks. |
| 3 | Portfolio card: equity, day PnL, cash, open orders. Market status: open or closed, and the next session from the exchange calendar. |
| 4 | Data freshness: "Updated after Tuesday's close", or a warning that links to Status. |
| 5 | Strategies trading on paper, with their latest signals. Recent backtest runs, each next to its buy-and-hold benchmark. |
| 6 | Biggest moves across your watchlists, news for watched symbols, and the latest journal notes. Panels can be reordered (drag or keyboard). |
| 9 | Triggered alerts and live prices with the tick flash. |

**Landing (signed out, Phase 2 onward):** one sentence on what Astraq is, the honesty pitch (one fill model, always a benchmark, no look-ahead by construction), and Sign in. Registration is invite-only, so there's no sign-up push. A real screenshot can replace the text later; never a mock.

### Stocks — `/stocks`

**For:** finding a symbol and opening its page.

- **Phase 1:** search by ticker or name over the bootstrapped symbols (`GET /api/symbols?query=`). Results show ticker, name, exchange, last close, and day change. Enter opens the top result.
- **Phase 2:** search covers the full active US equity universe. A symbol without stored candles shows "Loading history…" while the on-demand fetch runs. "Add to watchlist" on each result.
- **Phase 6:** filters (exchange, sector if the provider supplies it) and sortable columns (`DataTable`).

### Stock page — `/stocks/[symbol]`

**For:** everything about one symbol. A header (ticker, name, last price, day change, as-of time) sits above tabs. Each tab appears in the phase that fills it.

- **Chart tab (Phase 1):**
  - Candles plus a volume pane (`lightweight-charts`) from `GET /api/symbols/:ticker/candles?from&to&adjusted=true`.
  - A range picker (1M, 6M, 1Y, 5Y, Max, custom via `DateRangePicker`) and an adjusted / raw toggle. Split days are marked when showing raw prices.
  - The draw-in animation runs on first load only, and the crosshair tooltip shows OHLCV.
- **Phase 2:** "Add to watchlist" in the header.
- **Phase 3:** "Trade" in the header opens the order ticket (below). Your fills show as markers on the chart. A position summary (quantity, average cost, unrealized PnL) appears when you hold the symbol.
- **Backtests tab (Phase 5):** runs that included this symbol, plus "Backtest a strategy on this symbol". Strategy signals can be overlaid on the chart.
- **Phase 6, on the Chart tab:** indicator overlays (SMA, EMA, Bollinger) and RSI / MACD panes with synced crosshairs. Saved chart layouts.
- **Notes tab (Phase 6):** journal notes attached to this symbol, plus "New note".
- **News tab (Phase 6):** headlines for the symbol with source and time.
- **Forecast tab (Phase 8):** the model card for each forecast (data window, validation method, out-of-sample score vs naive). Forecast bands can be turned on as a chart overlay.
- **Phase 9:** a live price in the header, plus "Create alert".

### Order ticket (Phase 3)

A `Drawer`, not a page. It opens from the stock page, holdings rows, and the command palette.

- **Fields:** portfolio, side (buy / sell), quantity or notional, and order type (market / limit) with a limit price.
- **Preview before submitting:** estimated cost, commission, and when it fills under the shared fill model, e.g. "Market closed — fills at Wednesday's open".
- **Guards shown inline:** insufficient cash, max order notional, short selling not allowed.
- **Submitting:** an idempotency key is created when the ticket opens, so a double submit places one order. The order appears optimistically and rolls back with a toast if rejected.

### Watchlists — `/watchlists`, `/watchlists/[id]` (Phase 2)

**For:** keeping the symbols you follow, grouped your way.

- **List:** your watchlists, each with a symbol count and its best and worst movers today. Create, rename, delete (with undo).
- **Detail:** a row per symbol with last close, day change, and a sparkline from stored candles. Add symbols by search, remove them, and reorder by drag or keyboard. A row opens the stock page with the shared-element morph.
- **Phase 6:** a watchlist performance view over a chosen range links to `/analysis/watchlist/[id]`.
- **Phase 9:** live prices and tick flash in the rows.

### Portfolio — `/portfolios`, `/portfolios/[id]` (Phase 3)

**For:** paper portfolios whose numbers reconcile to the cent. "Portfolio" in the menu opens the last one you used, and the list appears only when you have more than one.

- **List:** each portfolio with equity, total return, and day PnL. Create a portfolio with starting cash and commission settings.
- **Holdings tab:** positions (quantity, average cost, market value, unrealized PnL, weight), cash, and totals. An equity curve over time. Realized PnL uses FIFO lots, and expanding a row shows its lots.
- **Orders tab:** open and past orders with status (pending, filled, cancelled, rejected) and the reason for any rejection. Cancel an open order.
- **Activity tab:** the ledger as a readable timeline of fills, cash deposits, commissions, dividends, and split adjustments. Every balance on the Holdings tab can be traced to entries here.
- **Phase 5:** strategies attached to the portfolio, and which orders they placed.

### Strategies — `/strategies` (Phase 5)

**For:** rule-based strategies defined in the versioned DSL.

- **List:** your strategies, with version, the paper portfolio each trades in (if any), and the latest backtest result vs benchmark.
- **New (`/strategies/new`):** start from a template (SMA crossover, RSI threshold, breakout) or from scratch. A form builds entry and exit rules, stop-loss and take-profit, and position sizing. The form validates with the same Zod schema as the API, and a JSON view shows the exact DSL.
- **Detail (`/strategies/[id]`):** the rules in plain language, version history (editing creates a new version), "Run backtest", "Trade on paper" (pick a portfolio), and recent runs and paper orders.
- **Phase 8:** ML signals appear as rule inputs, next to indicators.

### Backtests — `/backtests` (Phase 5)

**For:** honest results, always next to buy-and-hold.

- **List:** runs with strategy and version, symbols, date range, status (queued, running, done, failed), and headline metrics (CAGR, Sharpe, max drawdown) beside the benchmark's. Filter by strategy, symbol, or status.
- **Result (`/backtests/[id]`):**
  - The equity curve vs benchmark draws progressively while the job runs.
  - A drawdown pane, and a metrics table (CAGR, volatility, Sharpe, Sortino, max drawdown and duration, win rate, exposure, turnover) for the strategy and the benchmark.
  - A trades table. Clicking a trade shows it on the candle chart.
  - Run settings (fill model, commissions, slippage, data range) are always visible, so a result can't be read out of context.
  - Re-run with changed parameters creates a new run; it doesn't overwrite.
- **Phase 6:** hovering a trade highlights it on the chart (linked views).

### Analysis — `/analysis/*` (Phase 6)

**For:** questions across symbols or time, not about one stock. The index page lists the views. Each is its own route, with inputs in search params.

- `/analysis/compare`: relative performance of several symbols (rebased to 100) over a range.
- `/analysis/watchlist/[id]`: a performance table for one watchlist.
- `/analysis/drawdowns`: drawdown chart for a symbol or portfolio.
- `/analysis/returns`: returns distribution (`d3`).
- `/analysis/seasonality`: monthly or weekday seasonality heatmap (`d3`).

### Journal — `/journal`, `/journal/[id]` (Phase 6)

**For:** research notes that stay attached to what they're about.

- **List:** notes with tags and full-text search. Filter by symbol, trade, backtest run, or tag.
- **Note:** a title, a body, tags, and links to a symbol, trade, or backtest run. The note shows on that object's page too (Notes tab, trade row, run result).

### Alerts — `/alerts` (Phase 9)

**For:** being told when something you care about happens.

- **Rules:** price and indicator conditions and strategy signals. For each: delivery (in-app, email, Telegram), a cool-down, and on / off.
- **History:** triggered alerts with the time and value that triggered them, and a link to the chart at that moment.
- New rules are also created from the stock page header and a chart's price line.

### Settings — `/settings/*`

| Section | Route | Phase | Does |
|---|---|---|---|
| Profile | `/settings` | 2 | Name, email (read-only until verification exists). |
| Sessions | `/settings/sessions` | 2 | Signed-in devices, plus "Log out everywhere". |
| Security | `/settings/security` | 7 | Change password, TOTP 2FA setup, and recovery codes. |
| API keys | `/settings/api-keys` | 7 | Create scoped keys (shown once), list them, and revoke them. |

Appearance (theme, mode, density) stays in the top-bar theme menu, not Settings, because it works before sign-in.

### Status — `/status`

**For:** whether the system and the data can be trusted right now.

- **Phase 0:** replaces the current hand-written roadmap mirror. Shows API and ML service health (`/health`, then `/health/ready` from Phase 1) and the deployed version.
- **Phase 4:** data quality results (missing sessions, duplicate bars, OHLC sanity, stale symbols), the last end-of-day refresh, and job failures. A link to Bull Board (admin).
- **Phase 7:** becomes admin-only. `/admin/users` joins it.
- **Phase 10:** SLO status (candle freshness, API p95, alert delivery time) and links to the dashboards.

### Auth pages

- **`/login`, `/register` (Phase 2):** registration accepts only invited emails and says so up front. Errors never reveal whether an email exists.
- **`/forgot-password`, `/reset-password`, `/verify-email` (Phase 7):** they depend on email delivery.

## Shared patterns

- **Formatting:** money uses `Intl.NumberFormat` from decimal strings, never floats. Times show the exchange-local session date for daily bars and the user's time zone for events (orders, alerts). Changes show sign, color, and an arrow, never color alone.
- **As-of labels:** every price or metric derived from market data shows when its data ends.
- **Tables:** `DataTable` for anything sortable or long. Numbers are right-aligned with tabular numerals.
- **Charts:** `lightweight-charts` for anything with a time axis and price scale, and `d3` for distributions and heatmaps. Colors come from the `chart-*` tokens.
- **Destructive actions:** undo via toast where possible (remove from watchlist, delete note). `AlertDialog` only for actions that can't be undone (delete portfolio, revoke API key).

## Phase 0 cleanup

To make the current app match this plan:

1. **Delete** `/market-data`, `/experiments`, `/predictions/**`, `/stocks/[symbol]/{compare,custom,tradingview}`, and every route listed above for a later phase (`/watchlists`, `/portfolio/**`, `/strategies/**`, `/backtests/**`, `/account`). They come back in their phase.
2. **Replace the home page** (`(marketing)/page.tsx`): remove the mock chart, sample backtest, and forecast numbers and the stale phase status, and leave the short Phase 0 text page.
3. **Rename** "Forelume" to "Astraq" in the app shell, public header and footer, and page copy. Forelume is a theme.
4. **Navigation:** trim `apps/web/lib/navigation.ts` to Today, Stocks (from Phase 1), and Status. Drop the "Current focus" card from the sidebar.
5. **Status:** replace the hand-written phase table with real health checks.
6. **Auth screens:** `/login`, `/register`, and `/forgot-password` stay in Phase 0 as the ROADMAP says, but they aren't linked from the shell until Phase 2 makes them work.

## Open questions

- **Public market data in Phase 1.** Today and the stock page are public until auth lands in Phase 2, which shows provider data on a public URL. The ROADMAP's data licensing rule says no public redistribution. Options: keep the Phase 1 deployment behind a basic shared password, or accept it for the few weeks until Phase 2.
- **One portfolio or several by default.** The plan supports several (each with its own commission settings). If one is enough for v1, `/portfolios` collapses to `/portfolio`.
