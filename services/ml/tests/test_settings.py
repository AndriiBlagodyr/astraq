from __future__ import annotations

import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.settings import Settings


@pytest.fixture(autouse=True)
def clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    # A developer's shell may export these; tests must not depend on it.
    for name in ("ENVIRONMENT", "LOG_LEVEL", "DATABASE_URL", "REDIS_URL"):
        monkeypatch.delenv(name, raising=False)


def test_defaults_point_at_local_infra() -> None:
    settings = Settings()

    assert settings.environment == "development"
    assert settings.database_url.hosts()[0]["host"] == "localhost"
    assert settings.redis_url.host == "localhost"
    assert settings.redis_url.port == 6379


def test_rejects_a_non_postgres_database_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "mysql://localhost/forelume")

    with pytest.raises(ValidationError, match="database_url"):
        Settings()


def test_production_requires_infra_urls(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")

    with pytest.raises(ValidationError, match="DATABASE_URL, REDIS_URL"):
        Settings()


def test_production_accepts_explicit_urls(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DATABASE_URL", "postgresql://reader:secret@db.internal:5432/forelume")
    monkeypatch.setenv("REDIS_URL", "rediss://cache.internal:6380")

    assert Settings().environment == "production"
