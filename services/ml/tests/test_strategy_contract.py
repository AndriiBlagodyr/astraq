from __future__ import annotations

from typing import Any

import pytest
from pydantic import ValidationError

from app.backtest.strategy import Strategy, parse_strategy
from tests.fixtures import altered, load

# The strategy DSL's contract (ADR 0012). The Zod schema runs the same file
# in apps/api/src/strategies/strategy-dsl.spec.ts: the models here are
# generated from that schema, and this proves the generation kept its rules.
FIXTURES = load("strategies.json")


@pytest.mark.parametrize("name", FIXTURES["valid"])
def test_accepts(name: str) -> None:
    document = FIXTURES["valid"][name]
    definition = parse_strategy(document)

    # Nothing is defaulted, renamed, or dropped on the way through.
    assert definition.model_dump(mode="json") == document
    # And the engine can build every node of it.
    Strategy(definition)


@pytest.mark.parametrize("case", FIXTURES["invalid"], ids=lambda case: case["name"])
def test_refuses(case: dict[str, Any]) -> None:
    document = altered(FIXTURES["valid"][case["base"]], case["path"], case)

    with pytest.raises(ValidationError):
        parse_strategy(document)
