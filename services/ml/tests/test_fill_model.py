from __future__ import annotations

from decimal import Decimal, localcontext
from typing import Any

import pytest

from app.backtest.fill_model import (
    Fill,
    FillBar,
    FillCosts,
    FillOrder,
    fill_at_last_price,
    fill_on_bar,
    shares_for,
)
from tests.fixtures import load

# The shared fixtures are the fill model's contract (ADR 0008): the api's
# fill-model.spec.ts runs the same file.
FIXTURES = load("fill-model.json")


def _costs(raw: dict[str, Any]) -> FillCosts:
    return FillCosts(
        slippage_bps=raw["slippageBps"],
        commission_per_order=Decimal(raw["commissionPerOrder"]),
        commission_per_share=Decimal(raw["commissionPerShare"]),
    )


def _order(raw: dict[str, Any]) -> FillOrder:
    limit = raw["limitPrice"]
    return FillOrder(
        side=raw["side"],
        type=raw["type"],
        quantity=Decimal(raw["quantity"]),
        limit_price=None if limit is None else Decimal(limit),
    )


def _as_fixture(fill: Fill | None) -> dict[str, str] | None:
    if fill is None:
        return None
    return {
        "rule": fill.rule,
        "price": str(fill.price),
        "notional": str(fill.notional),
        "commission": str(fill.commission),
    }


@pytest.mark.parametrize("case", FIXTURES["cases"], ids=lambda case: case["name"])
def test_shared_fixture(case: dict[str, Any]) -> None:
    costs = _costs(FIXTURES["costs"][case["costs"]])
    order = _order(case["order"])
    if "bar" in case:
        bar = FillBar(**{name: Decimal(value) for name, value in case["bar"].items()})
        result = fill_on_bar(order, bar, costs)
    else:
        result = fill_at_last_price(order, Decimal(case["lastPrice"]), costs)

    assert _as_fixture(result) == case["expected"]


FREE = _costs(FIXTURES["costs"]["free"])
PRICED = _costs(FIXTURES["costs"]["priced"])
BAR = FillBar(Decimal("10"), Decimal("11"), Decimal("9"), Decimal("10"))


def test_rejects_a_quantity_of_zero_and_a_limit_order_without_a_price() -> None:
    with pytest.raises(ValueError):
        fill_on_bar(FillOrder("buy", "market", Decimal("0")), BAR, FREE)
    with pytest.raises(ValueError):
        fill_on_bar(FillOrder("buy", "limit", Decimal("1")), BAR, FREE)


def test_the_callers_decimal_context_changes_nothing() -> None:
    order = FillOrder("buy", "market", Decimal("123456789012.123456"))
    bar = FillBar(*(Decimal("9876543210.123456"),) * 4)
    expected = fill_on_bar(order, bar, PRICED)

    # Six digits would round the notional to 1.21994E+21.
    with localcontext() as context:
        context.prec = 6
        assert fill_on_bar(order, bar, PRICED) == expected
    assert expected is not None
    assert str(expected.notional) == "1219935974416962707967.25"


def test_a_dollar_amount_becomes_shares_at_the_quoted_price_rounded_down() -> None:
    # 1000 / 100.05 = 9.995002498...
    assert str(shares_for(Decimal("1000"), "buy", Decimal("100"), PRICED)) == "9.995002"
    assert shares_for(Decimal("0.01"), "buy", Decimal("99999"), FREE) == 0
