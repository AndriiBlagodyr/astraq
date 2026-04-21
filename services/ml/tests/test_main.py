from __future__ import annotations

import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.main import app


client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ml"}


def test_predict_returns_placeholder_signal() -> None:
    response = client.get("/predict")

    assert response.status_code == 200
    assert response.json() == {
        "symbol": "BTCUSDT",
        "prediction": "hold",
        "confidence": 0.0,
    }
