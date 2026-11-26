# services/ml — Veracand ML Service

- Python 3.12 (pinned in `.python-version`), FastAPI, uvicorn. Package managed with `uv` (`uv.lock`, `uv sync --group dev`).
- `package.json` exists only so `pnpm dev` (Turborepo) starts the service. Keep it to the `dev` script: no Node dependencies, no lint/test scripts (CI runs those through `uv`). See ADR 0003.
- Style: ruff (lint + format), mypy (strict on `app/`), pytest + hypothesis.
- Data: polars for heavy pipelines, pandas when interop with sklearn/statsmodels is required.
- Models: scikit-learn for tabular, PyTorch for sequence models (LSTM/TCN/N-BEATS).
- Owns the single event-driven backtest engine (`app/backtest/`). Shares the fill model with api paper trading: `fill_model.py` is a port of `apps/api/src/trading/fill-model.ts`, and both must pass `packages/shared/fixtures/fill-model.json`. Change a fill rule in that file first, then in both languages.
- Backtest engine rules. The parts (broker, portfolio, strategy) talk only through the events in `events.py`; a day is a `SessionEvent` then a `BarEvent`, and the strategy never hears the first. Don't hand the strategy a list of bars or let an order fill on the bar it was decided on. Indicators are fed one bar at a time (`indicators.py`) and every node of a compiled strategy is updated on every bar: no short-circuit. No floats anywhere in `app/backtest/`: `Decimal`, and every public entry point is wrapped in `exact` (`numbers.py`) so the caller's decimal context can't change a result. No clock and no randomness inside a run.
- `tests/golden/` is compared byte for byte. A change that moves it is a change to what a stored strategy means (ADR 0012 section 4): rewrite it with `UPDATE_GOLDEN=1 uv run pytest`, and say why in the PR.
- Contracts: Pydantic models in `app/contracts/`, generated from the JSON Schema in `packages/shared/json-schema/` (`uv run datamodel-codegen`, configured in `pyproject.toml`; `pnpm contract:ml` at the root). Don't hand-edit them; CI regenerates and fails on a diff. Validate a document from outside with `parse_strategy` (strict mode), not `model_validate`, so Python refuses what Zod refuses.
- Data access: read-only Postgres role on market data. Never write domain tables; return results through the job.
- Long jobs: BullMQ workers via the `bullmq` Python package (same queues as the api).
- Config: `pydantic-settings`, validated at boot.
- Experiment tracking: MLflow only once model work justifies it; artifacts in `artifacts/` (gitignored).
