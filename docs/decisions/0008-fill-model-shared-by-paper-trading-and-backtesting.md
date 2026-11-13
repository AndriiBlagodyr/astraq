# ADR 0008: Fill model shared by paper trading and backtesting

- Status: Accepted
- Date: 2026-11-12

## Context

Phase 3 adds paper trading and Phase 5 adds the backtester. Both have to answer the same question: given an order and the prices that came after it, does it fill, at what price, and what does it cost? If the two answer differently, a strategy's backtest and its paper portfolio drift apart for reasons that have nothing to do with the strategy. Veracand's wedge is that they can't (ROADMAP, Product North Star), so the rules are decided once, here, before either engine exists.

The constraints:

- Data is daily bars until Phase 9. A bar gives an open, high, low, and close, and nothing about the order of trades inside the session.
- The api places paper orders in TypeScript; the backtester is Python (there is exactly one backtest engine). The model has to live in both languages and stay identical.
- Fills move money, so every number is a decimal. No floats.
- The model must make look-ahead impossible by construction, not by discipline.

### Options considered

| Option | Verdict |
|---|---|
| **A small set of pure rules, specified by shared fixtures, implemented once per language** | **Chosen.** The rules fit on a page, each implementation is a few dozen lines, and one fixture file proves both agree. |
| One implementation, called across the language boundary (the api asks Python, or the reverse) | A network call inside order placement, and a paper trade that fails when the ML service is down. The model is too small to be worth a service. |
| Fill at the close of the bar that produced the signal | The classic look-ahead bug: the close isn't known until the session ends, and by then it can't be traded. |
| A richer simulation: partial fills, volume limits, intrabar paths | Daily bars can't support it. Guessing intrabar order adds invented precision. Listed under "Beyond v1". |

## Decision

### 1. One question, two entry points

The model is two pure functions over decimal strings (`apps/api/src/trading/fill-model.ts`):

- `fillOnBar(order, bar, costs)`: the order against one session's bar.
- `fillAtLastPrice(order, lastPrice, costs)`: a market order against the latest known price.

Each returns a fill (`rule`, `price`, `notional`, `commission`) or nothing. Neither knows about clocks, calendars, or the database. The caller decides which bar an order may see, under one rule:

> An order is only ever shown a bar whose session opened after the order was placed.

That rule is the look-ahead guard. In a backtest, a signal computed on bar *t* creates an order that first sees bar *t+1* (Phase 5's bias guard is this same rule). In paper trading, an order placed after the close first sees the next session's bar.

### 2. Market orders

| When it's placed | Fills at | Rule name |
|---|---|---|
| Market closed | The next session's open, plus slippage | `market_open` |
| Market open | The latest known price, plus slippage | `market_last` |

Until realtime prices exist (Phase 9), "the latest known price" is the latest stored daily close, which during a session is the previous day's. That is a stale price, and it's the one place paper trading is generous or harsh by luck. It's accepted because the alternative, holding the order until the next open, makes a paper trade placed at 10:00 wait a day. The backtester never takes this branch: its orders are always created after a bar closes, so they fill by `market_open`. Phase 9 replaces the stale close with the latest trade, and the rule's name and shape don't change.

### 3. Limit orders

Against a bar, for a buy with limit *L* (a sell mirrors it):

1. **The open is already below *L*** → fills at the open plus slippage, but never above *L* (`limit_open`). The order was marketable when the session started, so it gets the opening price, not its limit.
2. **Otherwise, the low is below *L*** → fills at exactly *L*, no slippage (`limit_cross`). The limit is the price the order rests at.
3. **Otherwise** → no fill.

"Below" is strict. A bar whose low only touches the limit doesn't fill: a real order at that price sits in a queue, and a touch doesn't say the queue cleared. This is the conservative reading of the roadmap's "fills when a bar's range crosses the limit", and it only ever makes results worse than a touch-fills rule would.

A limit order never fills on the latest price. Placed mid-session, it waits for the next bar.

### 4. Slippage

A per-portfolio number of basis points, applied to market-priced fills (`market_open`, `market_last`, and the open in `limit_open`):

- a buy pays `price × (1 + bps / 10000)`, rounded **up** to 6 decimal places
- a sell receives `price × (1 − bps / 10000)`, rounded **down** to 6 decimal places

Both the adjustment and the rounding go against the trader. The range is 0 to 1000 bps, checked by the model and by a CHECK constraint on `portfolios`.

### 5. Commission and notional

- `notional = quantity × price`, rounded half up to the cent. This is the cash that moves for the shares.
- `commission = commission_per_order + commission_per_share × quantity`, rounded half up to the cent. Both rates are per-portfolio columns and default to zero.

The commission is reported beside the notional, never folded into it. The ledger books it as its own expense (ADR 0009).

Half up means a tie rounds away from zero, which is Python's `ROUND_HALF_UP`. Naming it matters: Python's default for `Decimal` is banker's rounding, and the two engines would differ by a cent on ties.

### 6. What the model leaves out

- **Quantity.** An order fills whole or not at all. No partial fills, no volume cap.
- **Prices.** Bars are raw (unadjusted) prices, because those are the prices that traded. Adjusted prices are for signals; fills and cash use raw prices plus corporate actions (Phase 3 item 4, Phase 5).
- **Which orders are live.** Time in force, cancellation, and what a split does to a resting limit order belong to the order lifecycle (Phase 3 items 3 and 4), not to the fill model.
- **Whether the order is allowed.** Cash, short-selling, and notional guards are the ledger's and the risk rules' (ADR 0009, Phase 3 item 5).

### 7. The fixtures are the contract

`packages/shared/fixtures/fill-model.json` lists cases: an order, a bar or a last price, a cost setting, and the expected fill or `null`. `fill-model.spec.ts` runs every case. The Python port in Phase 5 runs the same file, and CI fails if either side disagrees with it. A change to the model is a change to that file first.

## Consequences

- Paper trading and backtesting can't diverge on fills without a fixture failing.
- Backtest results are slightly pessimistic by design: slippage and rounding go against the trader, and touched limits don't fill. A strategy that only works with touch-fills doesn't work.
- Mid-session paper market orders fill at a stale price until Phase 9 (section 2). The Phase 5 parity test replays signals through `fillOnBar` only, where the two engines are identical.
- Two implementations have to be kept in step by hand. The fixture file makes that a test failure rather than a review comment, but a rule nobody wrote a case for can still drift, so new rules arrive with cases.
- The model can't express partial fills or liquidity. For daily bars on liquid US equities at paper-trading sizes, that's the honest limit of the data.
