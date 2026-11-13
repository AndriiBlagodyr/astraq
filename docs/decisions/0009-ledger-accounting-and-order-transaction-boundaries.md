# ADR 0009: Ledger accounting and order transaction boundaries

- Status: Accepted (sections 1–6); the order boundary in section 7 is completed with ROADMAP Phase 3 item 3
- Date: 2026-11-12

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

A portfolio has five accounts:

| Account | Kind | Holds |
|---|---|---|
| `cash` | Asset | Cash in the portfolio |
| `securities` | Asset | Shares held, **at cost**, per symbol, with a share count |
| `capital` | Equity | What the owner paid in, less withdrawals |
| `fees` | Expense | Commissions |
| `realized_pnl` | Income | Gains and losses on sold shares, per symbol |

Every event is a **transaction** made of **entries**. An entry moves an amount into an account (a debit, stored positive) or out of it (a credit, stored negative), and a transaction's entries sum to zero:

| Event | Entries |
|---|---|
| Deposit 1000 | `cash` +1000, `capital` −1000 |
| Buy 10 shares for 100, commission 1 | `securities` +100 (+10 shares), `cash` −100, `fees` +1, `cash` −1 |
| Sell 4 of them for 80 (cost 40) | `cash` +80, `securities` −40 (−4 shares), `realized_pnl` −40 |

Since every transaction balances, so does the whole ledger, which gives the identity the property tests check after every step:

> cash + cost of shares held = capital + realized PnL − fees

Securities are carried at cost, so market value never enters the ledger. Unrealized PnL is a read-time figure: shares × latest price − cost.

Commissions are an expense of their own, not part of a lot's cost, so realized PnL is before fees and the fees total sits beside it. (Tax accounting adds the commission to the cost basis. A paper portfolio reads more clearly with them apart, and the sum is the same.)

### 2. Lots and FIFO

A buy opens a **lot**: a share count and what those shares cost. A sell takes shares from the oldest lots first. Lots aren't stored. They're rebuilt by replaying the securities entries in order.

A lot sold whole gives up its whole cost. A lot sold in part gives up `cost × sold / quantity`, rounded half up to the cent, and **keeps the rest**. So the cents of a lot are handed out exactly once: 3 shares bought for 10.00 and sold one at a time cost 3.33, 3.34, and 3.33. Pricing each share at 3.33 would lose a cent, and that kind of cent is what makes a portfolio fail to reconcile.

Keeping a lot as (shares, total cost) rather than (shares, price per share) also means a split (Phase 3 item 4) changes only the share count, with no division.

A sell stores the cost it took. Replay recomputes it by FIFO and refuses a history where the two differ, so an edited or misordered sell is caught, not summed.

### 3. Exact decimals, by hand

`apps/api/src/common/decimal.ts` is a small exact decimal: a `bigint` and a scale. Addition, subtraction, and multiplication are exact. The only lossy operations are `round` and `divide`, and both take the number of places and a rounding mode by name. The ledger rounds in one place (the partial-lot cost above); the fill model rounds prices, notional, and commission (ADR 0008).

Cash is stored in cents (`numeric(20,2)`), share counts to six places (`numeric(24,6)`): fractional shares exist as soon as a reverse split leaves one.

In production we'd use `decimal.js` or a money library rather than maintain this. The Python side uses the standard `Decimal`.

### 4. The rules live in pure functions

`apps/api/src/ledger/ledger.ts` has no database in it:

- `replay(transactions)` folds a history into a state: cash, capital, fees, realized PnL, and the open lots.
- `deposit`, `withdrawal`, `buy`, and `sell` take the current state and return the next transaction's entries, or throw a `LedgerError`: `insufficient_cash` (no buying on credit, no overdraft) or `insufficient_shares` (no short selling).
- `apply(state, transaction)` is one step of replay, and it audits as it goes: entries must balance, a sell's cost must be the FIFO cost, and cash must not go negative.

Because the rules are pure, the exit-criteria properties run as `fast-check` tests over random histories with no database: the identity above after every step, no negative cash or positions, and `replay(history)` equal to the state built step by step.

### 5. Schema

Migration `20261112120000_ledger`:

- `portfolios`: owner, name, and the fill model's cost settings.
- `ledger_transactions`: `portfolio_id`, `seq` (the transaction's place in the portfolio's history, from 1, unique per portfolio), `kind` (`deposit`, `withdrawal`, `buy`, `sell`), and `occurred_at` (when the event took effect, as opposed to `created_at`).
- `ledger_entries`: `transaction_id`, `account`, `symbol_id`, `amount`, `quantity`.

`kind` is a label for people and for the Activity timeline. The accounting reads only the entries. Dividends and splits add kinds in Phase 3 item 4.

### 6. What the database enforces

The pure functions decide what to write. The database refuses what must never be written, whoever asks:

- **Append-only.** A trigger on both ledger tables rejects every `UPDATE` and `TRUNCATE`, and every `DELETE` a statement asks for directly. The one delete that passes is the foreign key's cascade from a deleted portfolio (the trigger tells them apart by `pg_trigger_depth()`), so history disappears only together with its portfolio. A mistake is corrected by a new, reversing transaction.
- **Balanced.** A deferred constraint trigger sums each inserted transaction's entries at commit and aborts unless the total is zero.
- **Well-formed.** CHECK constraints: securities and realized-PnL entries name a symbol and the others don't; only securities entries carry shares; no entry is empty; `seq` starts at 1.

The triggers guard against bugs in the api, not against someone with the database owner's password, who can drop a trigger.

### 7. Transaction boundaries

**Posting to the ledger** is one database transaction (`LedgerRepository.append`):

1. `SELECT ... FOR UPDATE` on the portfolio's row. Two postings to the same portfolio now run one after the other; postings to different portfolios don't wait.
2. Read the portfolio's history and replay it.
3. Build the new transaction from that state (this is where insufficient cash or shares is refused) and run it through `apply`.
4. Insert the transaction and its entries with `seq = last + 1`.

The lock is what makes step 3 trustworthy. Without it, two sells could each see the same shares, or two withdrawals the same cash, and both commit. Read Committed isolation is enough once the lock is held, because nothing else can write to that portfolio's ledger in between. The unique `(portfolio_id, seq)` index is the backstop: a writer that somehow skipped the lock fails instead of forking the history.

**Placing and filling an order** (Phase 3 item 3) extends the same transaction: the order's status change, its fill row, and the ledger posting commit together or not at all, under the same portfolio lock, with the idempotency key checked inside it. This section gets its detail when that code exists.

## Consequences

- Every number on a portfolio page can be traced to entries, and the Activity tab ([docs/ui-plan.md](../ui-plan.md)) is the ledger read in order.
- Reads replay the whole history, and so does each posting. That's fine at paper-trading volumes: a few thousand entries is a small read and a short loop. When it isn't, the fix is a stored snapshot of the state at some `seq`, which replay can verify against; the ledger stays the source of truth.
- A portfolio with history can be deleted (taking its ledger with it) but never edited. Symbols referenced by the ledger can't be deleted, only deactivated.
- Nothing stops balanced entries being appended to an old transaction except that the repository never does. Closing that in the database would need a "transaction is sealed" flag; it hasn't been worth it yet.
- Postings to one portfolio are serialized. A portfolio is one person's account, so there's no contention to speak of.
- What we'd change for real money: a maintained decimal library, a currency on every amount, period closes, and an external reconciliation against the broker's statements. The double-entry core would stay.
