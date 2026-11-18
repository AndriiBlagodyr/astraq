# ADR 0009: Ledger accounting and order transaction boundaries

- Status: Accepted
- Date: 2026-11-12; extended 2026-11-13 with the order boundary (section 7) and corporate actions (section 8)

## Context

Phase 3's goal is "a portfolio whose numbers you would bet on". A paper portfolio has cash, positions, and a profit or loss, and every one of those can be wrong in a way that's hard to see: a balance updated twice, a sell that forgot which shares it sold, a cent lost to rounding on every partial sale.

The roadmap asks for the accounting to be built by hand, and for three properties to hold (Phase 3 exit criteria): cash and market value reconcile with the ledger, there are no negative positions, and replaying the ledger reproduces the state.

The constraints:

- Money is `numeric` in Postgres and exact decimals in code. Never a float.
- Realized PnL uses FIFO lots.
- One Postgres, written only by the api. Several api instances can post to one portfolio at once: the user clicking, and from Phase 5 a job filling orders.

### Options considered

| Option | Verdict |
|---|---|
| **A double-entry ledger; cash, lots, and PnL derived by replaying it** | **Chosen.** One source of truth, a history that explains every number, and an invariant (entries sum to zero) the database itself can check. |
| Mutable balances: a `cash` column and a `positions` table updated on each fill | Simplest reads. But a bug overwrites the evidence, "why is this number what it is" has no answer, and nothing ties cash to positions. |
| A single-entry journal (one row per cash or position change) | Append-only, but nothing says a buy's cash and its shares belong together, so half a fill can exist. |
| Event sourcing with stored snapshots and projections | The same idea with more machinery. The ledger is small enough to replay on every read; snapshots are the escape hatch, not the starting point (see Consequences). |

## Decision

### 1. Accounts and signs

A portfolio has seven accounts (the two for dividends are explained in section 8):

| Account | Kind | Holds |
|---|---|---|
| `cash` | Asset | Cash in the portfolio |
| `securities` | Asset | Shares held, **at cost**, per symbol, with a share count |
| `capital` | Equity | What the owner paid in, less withdrawals |
| `fees` | Expense | Commissions |
| `realized_pnl` | Income | Gains and losses on sold shares, per symbol |
| `dividends_receivable` | Asset | Dividends that have gone ex and aren't paid yet, per symbol |
| `dividend_income` | Income | Dividends earned, per symbol |

Every event is a **transaction** made of **entries**. An entry moves an amount into an account (a debit, stored positive) or out of it (a credit, stored negative), and a transaction's entries sum to zero:

| Event | Entries |
|---|---|
| Deposit 1000 | `cash` +1000, `capital` −1000 |
| Buy 10 shares for 100, commission 1 | `securities` +100 (+10 shares), `cash` −100, `fees` +1, `cash` −1 |
| Sell 4 of them for 80 (cost 40) | `cash` +80, `securities` −40 (−4 shares), `realized_pnl` −40 |
| The 6 left split 10-for-1 | `securities` 0 (+54 shares) |
| A dividend of 0.50 a share goes ex | `dividends_receivable` +30, `dividend_income` −30 |
| The dividend is paid | `cash` +30, `dividends_receivable` −30 |

Since every transaction balances, so does the whole ledger, which gives the identity the property tests check after every step:

> cash + cost of shares held + dividends receivable = capital + realized PnL + dividend income − fees

Securities are carried at cost, so market value never enters the ledger. Unrealized PnL is a read-time figure: shares × latest price − cost.

Commissions are an expense of their own, not part of a lot's cost, so realized PnL is before fees and the fees total sits beside it. (Tax accounting adds the commission to the cost basis. A paper portfolio reads more clearly with them apart, and the sum is the same.)

### 2. Lots and FIFO

A buy opens a **lot**: a share count and what those shares cost. A sell takes shares from the oldest lots first. Lots aren't stored. They're rebuilt by replaying the securities entries in order.

A lot sold whole gives up its whole cost. A lot sold in part gives up `cost × sold / quantity`, rounded half up to the cent, and **keeps the rest**. So the cents of a lot are handed out exactly once: 3 shares bought for 10.00 and sold one at a time cost 3.33, 3.34, and 3.33. Pricing each share at 3.33 would lose a cent, and that kind of cent is what makes a portfolio fail to reconcile.

Keeping a lot as (shares, total cost) rather than (shares, price per share) also means a split changes only the share count and never touches money (section 8).

A sell stores the cost it took. Replay recomputes it by FIFO and refuses a history where the two differ, so an edited or misordered sell is caught, not summed.

### 3. Exact decimals, by hand

`apps/api/src/common/decimal.ts` is a small exact decimal: a `bigint` and a scale. Addition, subtraction, and multiplication are exact. The only lossy operations are `round` and `divide`, and both take the number of places and a rounding mode by name. The ledger rounds in one place (the partial-lot cost above); the fill model rounds prices, notional, and commission (ADR 0008).

Cash is stored in cents (`numeric(20,2)`), share counts to six places (`numeric(24,6)`): fractional shares exist as soon as a reverse split leaves one.

In production we'd use `decimal.js` or a money library rather than maintain this. The Python side uses the standard `Decimal`.

### 4. The rules live in pure functions

`apps/api/src/ledger/ledger.ts` has no database in it:

- `replay(transactions)` folds a history into a state: cash, capital, fees, realized PnL, and the open lots.
- `deposit`, `withdrawal`, `buy`, and `sell` take the current state and return the next transaction's entries, or throw a `LedgerError`: `insufficient_cash` (no buying on credit, no overdraft) or `insufficient_shares` (no short selling).
- `split`, `dividend`, and `dividendPayment` do the same for corporate actions, and return nothing when there is nothing to book (section 8).
- `apply(state, transaction)` is one step of replay, and it audits as it goes: entries must balance, a sell's cost must be the FIFO cost, a split must add the shares its ratio gives, a dividend payment must match a dividend that is owed, and cash must not go negative.

Because the rules are pure, the exit-criteria properties run as `fast-check` tests over random histories with no database: the identity above after every step, no negative cash or positions, and `replay(history)` equal to the state built step by step.

### 5. Schema

Migration `20261112120000_ledger`:

- `portfolios`: owner, name, and the fill model's cost settings.
- `ledger_transactions`: `portfolio_id`, `seq` (the transaction's place in the portfolio's history, from 1, unique per portfolio), `kind` (`deposit`, `withdrawal`, `buy`, `sell`), and `occurred_at` (when the event took effect, as opposed to `created_at`).
- `ledger_entries`: `transaction_id`, `account`, `symbol_id`, `amount`, `quantity`.

Migration `20261113120000_orders_corporate_actions`:

- `orders` and `fills` (section 7).
- Three more kinds (`split`, `dividend`, `dividend_payment`) and the two dividend accounts.
- `ledger_transactions.split_from` and `split_to`: a split's ratio.
- `corporate_actions.pay_date`: when a dividend's cash is paid.

`kind` is a label for people and for the Activity timeline, and the accounting reads only the entries, with one exception. A split's entry says how many shares it adds in total, but lots are converted one by one, so replay reads the `split` kind and the ratio stored on the transaction to redo it.

### 6. What the database enforces

The pure functions decide what to write. The database refuses what must never be written, whoever asks:

- **Append-only.** A trigger on both ledger tables rejects every `UPDATE` and `TRUNCATE`, and every `DELETE` a statement asks for directly. The one delete that passes is the foreign key's cascade from a deleted portfolio (the trigger tells them apart by `pg_trigger_depth()`), so history disappears only together with its portfolio. A mistake is corrected by a new, reversing transaction.
- **Balanced.** A deferred constraint trigger sums each inserted transaction's entries at commit and aborts unless the total is zero.
- **Well-formed.** CHECK constraints: securities, realized-PnL, and dividend entries name a symbol and the others don't; only securities entries carry shares; no entry is empty; `seq` starts at 1; a split transaction has a ratio and nothing else does. On `orders`: a limit order has a limit price and a market order doesn't, an open order has no end time, and a cancelled or rejected one has a reason.

The triggers guard against bugs in the api, not against someone with the database owner's password, who can drop a trigger.

### 7. Transaction boundaries

**Posting to the ledger** is one database transaction:

1. `SELECT ... FOR UPDATE` on the portfolio's row. Two postings to the same portfolio now run one after the other; postings to different portfolios don't wait.
2. Read the portfolio's history and replay it.
3. Build the new transaction from that state (this is where insufficient cash or shares is refused) and run it through `apply`.
4. Insert the transaction and its entries with `seq = last + 1`.

The lock is what makes step 3 trustworthy. Without it, two sells could each see the same shares, or two withdrawals the same cash, and both commit. Read Committed isolation is enough once the lock is held, because nothing else can write to that portfolio's ledger in between. The unique `(portfolio_id, seq)` index is the backstop: a writer that somehow skipped the lock fails instead of forking the history.

Nothing in the api posts this way any more (amended 2026-11-16). A cash move used to: `POST .../transfers` appended a deposit or withdrawal straight to the ledger. But a portfolio is settled lazily, so the ledger a transfer met could be days behind the market data. A deposit made on Wednesday then paid for an order that had met Tuesday's bar with too little cash, and a withdrawal could take cash that Tuesday's fill had already spent, turning that fill into a rejection. Cash moves now go through the wider transaction below, which settles first. The standalone path (`LedgerRepository.append` and the `LedgerService` over it) is deleted, so there is one way to write a ledger; `LedgerRepository` only reads and inserts rows inside the caller's transaction, and the ledger's integration test posts through `OrdersRepository.transact`. The four steps above still describe what happens, as the core of the wider transaction.

**Placing, cancelling, and filling an order, and moving cash,** is the same transaction, wider (`OrdersRepository.transact`):

1. `SELECT ... FOR UPDATE` on the portfolio's row, with the owner's id in the WHERE clause, so a portfolio that isn't the user's is not found.
2. Read what the decision needs: the ledger, the open orders, the daily bars those orders may fill on, the corporate actions of every symbol involved, and (for a placement) the order already stored under the request's idempotency key.
3. A pure function decides (`apps/api/src/trading/settlement.ts`). `settle`, `place`, `cancel`, and `transfer` return a plan: ledger postings, fills, and order status changes.
4. Write the plan. A fill is three writes (its ledger transaction, its `fills` row pointing at that transaction, and the order's status), and they commit together with everything else in the plan, or not at all.

As with the ledger alone, the lock is what makes the decision trustworthy, and the decision is pure because it runs while the lock is held.

**Settlement.** An order doesn't fill at the moment a bar is stored. `settle` walks the sessions up to today in date order and, for each one, books in this order: splits going ex, dividends going ex, dividends whose pay date has come, then open orders against that session's bar, oldest order first. An order only sees a session that opened after it was placed (ADR 0008). Settling is deterministic and repeatable: run twice, the second run writes nothing, because every step leaves the state it would otherwise act on. So it doesn't matter when it runs, and until a job exists it runs whenever a portfolio is read or written. `place` and `cancel` settle first, which is what makes a cancel honest: an order that a stored bar has already filled is filled. The Phase 4 end-of-day job will call the same function after it stores the day's bars.

**Idempotency.** `POST /api/portfolios/{id}/orders` requires an `Idempotency-Key` header. The key is stored on the order, unique per portfolio, and looked up in step 2, under the lock. Two requests with one key therefore run one after the other, and the second finds the first one's order and returns it (with `Idempotency-Replayed: true`) instead of placing another. The unique index is the backstop for a writer that skipped the lock. A repeated key with a different order is a 409, not a silent replay of the old one. Keys never expire: at paper-trading volumes there is nothing to clean up.

**Order states.** `open` → `filled`, `cancelled`, or `rejected`, and nothing leaves those three. A market order placed during the session is filled or rejected at once (`market_last`); every other order starts `open`. The guards against buying on credit and selling short are the ledger's (section 4), applied at the fill: an order whose fill the ledger refuses is `rejected` with the reason, not left to try again. Orders have no time in force; they wait until they fill or are cancelled. An order is also checked against cash and holdings when it is *placed* (section 9); one refused there never becomes an order, so it has no state.

**Posting order is not time order.** A market order placed today during the session fills now, at `seq` n. A limit order resting since yesterday may fill on today's bar, which is only stored tomorrow, at `seq` n+1 with an earlier `occurred_at`. That's inherent in mixing daily bars with immediate fills. `seq` is the order things were booked in, and FIFO and the cash guard follow it; `occurred_at` is when each took effect.

### 8. Corporate actions

Market data already stores splits and dividends by ex-date (`corporate_actions`). Settlement applies them to portfolios.

**Splits.** Each lot remembers which session's shares it is counted in (`unitsAsOf`: the day it was bought, then the ex-date of the last split applied). A split with ex-date *E* converts every lot that is behind *E*: `quantity × to / from`, rounded half up to a millionth of a share, cost unchanged. Lots bought on or after *E* were bought at post-split prices and are left alone. This rule is per lot rather than "has this split been applied to the portfolio", so applying a split twice changes nothing, and a lot that turns up late (a resting order filled on an old bar) is still converted.

In the ledger a split is one `securities` entry with a zero amount and the shares added (negative for a reverse split). It moves no money, so cost, cash, and the accounting identity can't change, and the position's market value is the same before and after: ten times the shares at a tenth of the price.

Two details:

- A reverse split can leave a fraction of a share, which is kept (a broker would pay cash for it). A lot never rounds to nothing: it keeps at least a millionth of a share, so its cost always has shares to belong to.
- An order still open when its symbol splits is cancelled with the reason `split`, if it was placed before the ex-date: its quantity and limit were in the old shares. And a market order filled at the last close on an ex-date gets that close divided by the split first, so the price and the shares are in the same units.

**Dividends.** A dividend is earned on the ex-date and paid later, so it is two transactions:

1. On the ex-date, the shares bought before that day earn `shares × cash per share`, rounded half up to the cent: `dividends_receivable` debit, `dividend_income` credit. Selling the shares the next day doesn't lose the dividend, as in a real account.
2. On the pay date the receivable becomes cash.

Booking the income on the ex-date rather than the pay date matters for the equity curve: the share price drops by the dividend on the ex-date, and without the receivable the portfolio would look poorer for the weeks until the cash arrived. The pay date comes from the provider (`corporate_actions.pay_date`); without one, the dividend is paid on the ex-date.

A split and a dividend with the same ex-date apply in that order: the dividend's amount per share is quoted in the shares that trade that day.

### 9. Guards at placement and the exchange calendar

Added 2026-11-17 (Phase 3 item 5).

**Two checks, on purpose.** The ledger refuses a fill the portfolio can't take (section 4). That check is exact, but it runs when the order fills, which for a resting order is a day later: until then an order for a hundred times the cash sits there looking valid. So placement has its own check (`apps/api/src/trading/risk.ts`, pure), and a refusal there is a 422 with the reason; nothing is stored. The check at the fill stays, because the first one works from an estimate and prices move between the two.

**What the estimate is.** A market order is priced at the symbol's latest stored close in today's shares, with the portfolio's slippage; a limit order at its limit, the worst price it can fill at. Both go through the fill model, so the commission is the one the fill will charge. A market order on a symbol without a bar has no estimate and passes: it can't fill before a bar exists, and the ledger checks it then.

**The three rules**, checked in this order:

1. A sell needs the shares: held, less what open sell orders already promise. No short selling.
2. Either side must be within the portfolio's `max_order_notional`, when it has one. The limit is on the notional, before commission, and is set when the portfolio is created.
3. A buy needs the cash for its notional and commission: the settled cash, less what open buy orders are expected to take by the same estimate.

Open sell orders free nothing: their proceeds don't exist until they fill. That makes the cash rule conservative, which is the right way to be wrong.

**Where it runs.** Inside `OrdersRepository.transact`, after settling and under the portfolio's lock, like the placement it guards. Two orders placed at once therefore can't each be told the same cash is free. The idempotency lookup comes first: a repeated key returns the order it placed, even if the portfolio could no longer afford it.

**Preview.** `POST .../orders/preview` runs the same function and returns its answer instead of acting on it: when the order would fill, the estimate, the cash after, and the refusal if there is one. It takes the lock and settles in memory but writes nothing. One function behind both is what keeps the order ticket's preview from disagreeing with the placement.

**The exchange calendar.** `market_sessions` holds one row per trading day with its open and close as instants, loaded from Alpaca's calendar. The session clock (`market-hours.ts`) stays pure: the service reads the days around "now" into a `SessionCalendar` and passes it in. A date the calendar covers is a session or not as it says, so a holiday is closed and a half day ends at 13:00; a date it doesn't cover falls back to the old rule, weekdays 09:30 to 16:00. The fallback is why a database without the calendar still trades instead of refusing every order, and why the older tests didn't change.

The calendar is reference data, not portfolio state, so it is read before the transaction and outside the lock. It reloads itself: a read that finds less than a week stored ahead asks Alpaca for the next year, inline, and a failure is logged and skipped. The bars decide where a resting order fills (only trading days have bars), so the calendar changes two things only: whether a market order placed now fills at once, and which session the preview names.

## Consequences

- Every number on a portfolio page can be traced to entries, and the Activity tab ([docs/ui-plan.md](../ui-plan.md)) is the ledger read in order.
- A `GET` on a portfolio can write (it settles first). The writes are ones the read would have had to compute anyway, they're idempotent, and they disappear behind the end-of-day job in Phase 4.
- Corporate actions are only as good as the market data's timing. A dividend that is loaded after its shares were sold is missed, and a split loaded late is applied late. Both close when ingestion keeps data fresh (Phase 4); until then a rerun of the bootstrap before trading is the remedy.
- The session clock knows holidays and half days only where the exchange calendar is loaded (section 9). Without Alpaca keys and without a `calendar:sync` run it knows weekends, and on a holiday a market order then fills at the last close instead of waiting for the next open.
- A preview can be out of date by the time the order is placed: it promises nothing, and the placement runs the check again.
- Reads replay the whole history, and so does each posting. That's fine at paper-trading volumes: a few thousand entries is a small read and a short loop. When it isn't, the fix is a stored snapshot of the state at some `seq`, which replay can verify against; the ledger stays the source of truth.
- A portfolio with history can be deleted (taking its ledger with it) but never edited. Symbols referenced by the ledger can't be deleted, only deactivated.
- Nothing stops balanced entries being appended to an old transaction except that the repository never does. Closing that in the database would need a "transaction is sealed" flag; it hasn't been worth it yet.
- Postings to one portfolio are serialized. A portfolio is one person's account, so there's no contention to speak of.
- What we'd change for real money: a maintained decimal library, a currency on every amount, period closes, and an external reconciliation against the broker's statements. The double-entry core would stay.
