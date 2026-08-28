# services/ml — Astraq ML Service

- Python 3.12 (pinned in `.python-version`), FastAPI, uvicorn. Package managed with `uv` (`uv.lock`, `uv sync --group dev`).
- Style: ruff (lint + format), mypy (strict on `app/`), pytest + hypothesis.
- Data: polars for heavy pipelines, pandas when interop with sklearn/statsmodels is required.
- Models: scikit-learn for tabular, PyTorch for sequence models (LSTM/TCN/N-BEATS).
- Experiment tracking: MLflow; artifacts stored in `artifacts/` (gitignored) or S3 in prod.
- Long jobs: Celery (Redis broker) or arq. Progress streamed back via Redis pub/sub.
