from typing import Literal, Self

from pydantic import PostgresDsn, RedisDsn, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Defaults point at `pnpm infra:up` (infra/docker/compose.yml), so a fresh
# clone boots with no .env. Production gets no defaults for these: a missing
# value there is a deploy mistake, not something to paper over.
REQUIRED_IN_PRODUCTION = ("database_url", "redis_url")


class Settings(BaseSettings):
    """Service config, read from environment variables (case-insensitive)."""

    model_config = SettingsConfigDict(frozen=True, extra="ignore")

    environment: Literal["development", "production", "test"] = "development"
    log_level: Literal["critical", "error", "warning", "info", "debug"] = "info"
    # Read-only market data access (AGENTS.md); the api owns domain writes.
    database_url: PostgresDsn = PostgresDsn("postgres://forelume:forelume@localhost:5432/forelume")
    # BullMQ queues shared with the api.
    redis_url: RedisDsn = RedisDsn("redis://localhost:6379")

    @model_validator(mode="after")
    def _no_local_defaults_in_production(self) -> Self:
        if self.environment != "production":
            return self
        # model_fields_set holds only the values that came from the env.
        missing = [name for name in REQUIRED_IN_PRODUCTION if name not in self.model_fields_set]
        if missing:
            names = ", ".join(name.upper() for name in missing)
            raise ValueError(f"Required in production: {names}")
        return self


# Built at import, so an invalid env fails `uvicorn app.main:app` at startup
# instead of on the first request.
settings = Settings()
