# services/ml — Astraq ML Service

- Python 3.12 (pinned in `.python-version`), FastAPI, uvicorn. Package managed with `uv` (`uv.lock`, `uv sync --group dev`).
- Style: ruff (lint + format), mypy (strict on `app/`), pytest + hypothesis.
- Data: polars for heavy pipelines, pandas when interop with sklearn/statsmodels is required.
- Models: scikit-learn for tabular, PyTorch for sequence models (LSTM/TCN/N-BEATS).
- Owns the single event-driven backtest engine (`app/backtest/`). Shares the fill model with api paper trading.
- Contracts: Pydantic models generated from `packages/shared` JSON Schema (`datamodel-code-generator`). Don't hand-edit generated models.
- Data access: read-only Postgres role on market data. Never write domain tables; return results through the job.
- Long jobs: BullMQ workers via the `bullmq` Python package (same queues as the api).
- Config: `pydantic-settings`, validated at boot.
- Experiment tracking: MLflow only once model work justifies it; artifacts in `artifacts/` (gitignored).
