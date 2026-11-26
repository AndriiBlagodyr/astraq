# ADR 0012: Strategy DSL shape and versioning

- Status: Accepted
- Date: 2026-11-25

## Context

Phase 5 closes the loop the product is for: write a rule, test it on history, run it on a paper portfolio. One description of the rule has to serve three readers:

- the **api** (TypeScript), which validates it, stores it, and later serves it to a form in the web app;
- the **backtester** (Python, `services/ml`), which runs it over years of bars;
- the **paper-trading job** (Phase 5 item 7), which evaluates it after each close and places orders.

If the backtester and the paper job read the rule differently, a strategy's backtest and its live paper record diverge for reasons that have nothing to do with the strategy. That is the same argument that put the fill model in one fixture file (ADR 0008), one level up.

The constraints:

- Two languages, and the rule crosses between them as JSON inside a job.
- It is stored. A strategy saved today must mean the same thing next year, or be refused, never quietly reinterpreted.
- Anything a signed-in user can type reaches a Python worker. The rule must not be able to do anything but compute.
- The roadmap's kill trigger: if the design runs past a week, freeze it at SMA crossover and RSI threshold.

### Options considered

| Option | Verdict |
|---|---|
| **A JSON document: a tree of conditions over series, defined in Zod, exported to JSON Schema, generated into Pydantic** | **Chosen.** Data, not code: it can be validated, stored, diffed, rendered as a form, and run by an interpreter that does nothing else. |
| Strategies as Python code (a class with `on_bar`, as backtrader and zipline do) | The most expressive, and it means running user code in the worker. A sandbox is a project of its own, and code can't be turned back into a form. |
| An expression language in a string (`sma(close, 20) > sma(close, 50)`) | Pleasant to type, and it needs a parser, error messages with positions, and a second parser in the other language. The tree below is what that parser would produce; the form builds it directly. |
| A fixed list of templates with parameters (crossover, RSI threshold) | The kill trigger's fallback. Every new idea is a code change in two languages. |
| Hand-written models in both languages, kept in step by review | The same shape written twice drifts on the first rename. |

## Decision

### 1. The document

A strategy is one JSON object (`packages/shared/src/strategies.ts`, `StrategyDefinitionSchema`):

```json
{
  "version": 1,
  "entry": { "type": "cross", "left": { "type": "sma", "period": 20, "source": "close" },
             "direction": "above", "right": { "type": "sma", "period": 50, "source": "close" } },
  "exit":  { "type": "cross", "left": { "type": "sma", "period": 20, "source": "close" },
             "direction": "below", "right": { "type": "sma", "period": 50, "source": "close" } },
  "stopLoss": { "percent": "8" },
  "takeProfit": null,
  "sizing": { "type": "percent_of_equity", "percent": "95" }
}
```

Two kinds of node, each tagged by `type`:

- A **series** is a value per bar: `bar` (a field of the bar itself), `constant`, `sma`, `ema`, `rsi`, `atr`, `bollinger`.
- A **condition** is true or false per bar: `compare` (two series and `gt`, `gte`, `lt`, `lte`), `cross` (one series crossing another, `above` or `below`), and `all` / `any` over 2 to 8 conditions, which nest.

Series don't nest: there is no "RSI of an SMA". Nothing on the roadmap needs it, and it can be added without a new version (section 4).

What the document leaves out is deliberate. It has no symbol, no dates, no starting cash, and no trading costs: those belong to a backtest request or a paper portfolio, and the same strategy runs on many of each. It has no name: that is a column where it is stored.

### 2. What a strategy means

The schema says what a document may contain. These rules say what it does, and they bind every engine that reads one:

- **Long-only, one symbol, one position.** The strategy is flat or in. While flat only `entry` is listened to; while in, only the ways out. Short selling isn't in the paper ledger either (ADR 0009).
- **Decide at the close, act at the next open.** Every condition is evaluated on a completed bar and becomes a market order that fills by the fill model's `market_open` (ADR 0008). No rule in the DSL can name a price inside the bar it was decided on.
- **A warming-up indicator is not a signal.** An SMA of 50 has no value for 49 bars. A `compare` or `cross` that reads a series without a value is false; it is never an error and never treated as zero.
- **A cross is one bar.** `cross above` holds on the bar where the left series is above the right and was at or below it on the bar before. It needs both series to have had values on both bars.
- **Stop-loss and take-profit are exits at the close.** They compare the bar's close with the price the entry filled at. They are not stop orders resting in the market, because the fill model has no such order: adding one would mean deciding where inside a daily bar it fills, which is the invented precision ADR 0008 refused. So a stop of 8% can cost more than 8% when a session gaps or falls further by the close, and the backtest shows that loss.
- **The order of the ways out** on one bar is stop-loss, then take-profit, then `exit`. Only the reason recorded on the order depends on it; all three sell everything at the next open.
- **Sizing happens at the signal.** `fixed_notional` is a dollar amount; `percent_of_equity` is a share of the portfolio's value at that close. Either becomes shares the way a paper order asked for in dollars does (`sharesFor` in the api): at the close with slippage, rounded down to a millionth of a share. The fill a day later is at another price, so an order sized to all of the cash can be refused at its fill, as it would be on paper.

Indicator definitions are fixed with the names, since two libraries rarely agree: the EMA is seeded with the simple average of its first `period` values; RSI and ATR use Wilder's smoothing; RSI is 100 with no losses in its window and 50 with no movement; Bollinger bands use the population standard deviation. `services/ml/app/backtest/indicators.py` is the reference.

### 3. One definition, generated

Zod is the source. Nothing about the document is written by hand twice:

```
packages/shared/src/strategies.ts
   │  pnpm contract            (z.toJSONSchema)
   ▼
packages/shared/json-schema/strategy.schema.json     committed
   │  pnpm contract:ml         (datamodel-code-generator)
   ▼
services/ml/app/contracts/strategy.py                committed, never edited
```

CI runs both steps and fails on a diff, the way it already does for `openapi.json` and the SDK (ADR 0004). The Node job checks the JSON Schema, the ML job checks the models.

JSON Schema is narrower than Zod, and a rule that doesn't fit through it would hold in the api and vanish in Python. So the DSL is written inside what JSON Schema can say:

- **No `.refine`, `.transform`, or `.default`.** "Above zero" is part of a string's pattern, not a check after it.
- **Patterns without lookahead.** Pydantic checks patterns with Rust's regex engine, which has none. `^(?=.*[1-9])…` would be the short way to say "not zero" and can't be used. A digit is written `[0-9]`, never `\d`: that engine reads `\d` as any Unicode digit where JavaScript reads it as 0 to 9, and Python's `Decimal` takes those digits as numbers, so `"9٥"` was a percentage in Python and a refusal in Zod.
- **Strict objects, every key required.** An unknown key is an error on both sides, and "no stop-loss" is `"stopLoss": null`, not an absent key. A stored document then always has the same keys, and a typo (`"stoploss"`) is refused rather than ignored.
- **Decimals are strings**, as everywhere else in the contracts: a threshold of `"0.1"` must be the same number in both languages. Periods are integers.

The Python side validates in Pydantic's strict mode (`parse_strategy`). In its default mode Pydantic reads the text `"20"` as the number 20; Zod doesn't, and the two must agree on what a valid document is. Strict mode has one gap of its own: Python's `True == 1`, so `"version": true` passed for version 1. The DSL has no boolean, and `parse_strategy` refuses a document with one anywhere in it before the models see it.

`packages/shared/fixtures/strategies.json` is the proof: three documents both sides must accept and return unchanged, and some thirty alterations both must refuse. `apps/api/src/strategies/strategy-dsl.spec.ts` and `services/ml/tests/test_strategy_contract.py` run it. A new constraint arrives with a case.

One thing JSON Schema can't bound is how deep `all` and `any` nest. The width is capped at 8 and the depth is left to the size limit on a request body.

### 4. Versioning

`version` is a required integer, `1` today, and the first thing an engine reads.

- **Adding** is not a new version: a new series type, a new condition type, a new sizing type. An old document is still valid and still means the same. An engine that predates the addition refuses a document that uses it (an unknown `type` fails validation), which is the right failure.
- **Changing what an existing document means** is a new version: a different seed for the EMA, a stop that fills intrabar, a renamed key, a new required key. `version: 2` gets its own schema beside version 1, and `StrategyDefinitionSchema` becomes a union on `version`.
- **Old versions are migrated when read, not rewritten in place.** A function per step (`1 → 2`) upgrades a document on its way out of the database. A stored backtest keeps the document it ran, at the version it ran, so its result can always be explained.
- **An engine refuses a version it doesn't know.** There is no best-effort reading of a newer document.

A change to an indicator's arithmetic is a change of meaning even though no key moves. The golden-file test in `services/ml` (same strategy, same bars, byte-identical result) is what notices one.

## Consequences

- The api, the backtester, and the paper job read one definition. A field can't exist on one side only without CI failing.
- A strategy is data: it can be stored in a `jsonb` column, compared, and edited by a form that maps one control to one node. It can't loop, read a file, or look at tomorrow.
- The DSL is small on purpose. Rules about several symbols, shorting, scaling in and out, time of day, and indicators of indicators can't be written. Most are additions under section 4; several positions or several symbols are a new version and a different engine.
- Writing constraints as lookahead-free patterns is clumsier than `.refine`, and the patterns are hard to read. Each has a description beside it and cases in the fixture file.
- Stops are checked at the close, so results on gapping stocks are worse than a resting stop order would have given on paper. That is the pessimistic side to be wrong on, and it keeps backtest and paper identical.
- Generated Python models use the wire's names (`stopLoss`, `takeProfit`) and wrap unions in `RootModel`, so the engine reads `.root` at each node. That is the cost of not hand-editing them.
- Two more generated files are committed, and a schema change is now two commands (`pnpm contract`, `pnpm contract:ml`). The second needs `uv`, which the Node CI job doesn't have, so they stay separate.
