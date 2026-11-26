from __future__ import annotations

import dataclasses
import json
import os
from datetime import date, timedelta
from decimal import Decimal, localcontext
from pathlib import Path
from typing import Any

import pytest

from app.backtest.engine import BacktestConfig, BacktestResult, run_backtest
from app.backtest.events import Bar
from app.backtest.fill_model import FillCosts
from app.backtest.strategy import Strategy, parse_strategy
from tests.fixtures import strategy

START = date(2024, 1, 2)
CASH = BacktestConfig(starting_cash=Decimal("10000.00"))


def _bars(*rows: tuple[str, str]) -> list[Bar]:
    """One bar per (open, close), on consecutive days."""
    bars = []
    for index, (open_, close) in enumerate(rows):
        low, high = sorted((Decimal(open_), Decimal(close)))
        bars.append(
            Bar(
                START + timedelta(days=index), Decimal(open_), high, low, Decimal(close), Decimal(1)
            )
        )
    return bars


def _close(operator: str, level: str) -> dict[str, Any]:
    return {
        "type": "compare",
        "left": {"type": "bar", "field": "close"},
        "operator": operator,
        "right": {"type": "constant", "value": level},
    }


def _definition(**overrides: Any) -> Any:
    """In above 10, out below 10, a thousand dollars at a time."""
    document = {
        "version": 1,
        "entry": _close("gt", "10"),
        "exit": _close("lt", "10"),
        "stopLoss": None,
        "takeProfit": None,
        "sizing": {"type": "fixed_notional", "amount": "1000"},
    }
    return parse_strategy(document | overrides)


def test_a_signal_fills_at_the_next_bars_open() -> None:
    bars = _bars(("9", "9"), ("10", "11"), ("11.5", "12"), ("12", "9"), ("8.5", "9"))

    result = run_backtest(_definition(), bars, CASH)

    buy, sell = result.orders
    # Decided on the close of 11, sized there (1000 / 11), filled a day later at 11.5.
    assert (buy.placed_on, buy.filled_on) == (bars[1].date, bars[2].date)
    assert str(buy.quantity) == "90.909090"
    assert buy.fill is not None and str(buy.fill.price) == "11.500000"
    assert str(buy.fill.notional) == "1045.45"
    # Out on the close of 9, sold at the next open of 8.5, not at 9.
    assert (sell.placed_on, sell.filled_on) == (bars[3].date, bars[4].date)
    assert sell.fill is not None and str(sell.fill.notional) == "772.73"

    (trade,) = result.trades
    assert (trade.exit_reason, str(trade.pnl)) == ("exit", "-272.72")
    # The day of the entry signal the portfolio is still all cash.
    assert [str(point.equity) for point in result.equity_curve] == [
        "10000.00",
        "10000.00",
        "10045.46",
        "9772.73",
        "9727.28",
    ]


def test_a_signal_on_the_last_bar_has_no_session_to_fill_in() -> None:
    result = run_backtest(_definition(), _bars(("9", "9"), ("10", "11")), CASH)

    (order,) = result.orders
    assert (order.status, order.fill) == ("open", None)
    assert result.trades == []
    assert result.final_equity == Decimal("10000.00")


def test_costs_come_from_the_shared_fill_model() -> None:
    costs = FillCosts(5, Decimal("1.00"), Decimal("0.005"))
    bars = _bars(("9", "9"), ("10", "11"), ("11.5", "12"))

    result = run_backtest(_definition(), bars, BacktestConfig(Decimal("10000.00"), costs))

    (buy,) = result.orders
    # Sized at the close with slippage: 1000 / 11.0055.
    assert str(buy.quantity) == "90.863659"
    assert buy.fill is not None
    assert (str(buy.fill.price), str(buy.fill.commission)) == ("11.505750", "1.45")
    assert result.equity_curve[-1].cash == Decimal("10000.00") - buy.fill.notional - Decimal("1.45")


def test_the_stop_and_the_target_are_checked_at_the_close_from_the_entry_fill() -> None:
    # In at 11.5. A 10% stop is a close at or under 10.35; a 20% target, at or over 13.8.
    stopped = run_backtest(
        _definition(exit=None, stopLoss={"percent": "10"}),
        _bars(("9", "11"), ("11.5", "10.36"), ("10.4", "10.35"), ("10.2", "9.9")),
        CASH,
    )
    taken = run_backtest(
        _definition(exit=None, takeProfit={"percent": "20"}),
        _bars(("9", "11"), ("11.5", "13.79"), ("13.9", "13.8"), ("14", "9.9")),
        CASH,
    )

    assert [(order.reason, order.placed_on) for order in stopped.orders] == [
        ("entry", START),
        ("stop_loss", START + timedelta(days=2)),
    ]
    assert stopped.trades[0].exit_price == Decimal("10.2")
    assert [order.reason for order in taken.orders] == ["entry", "take_profit"]
    assert taken.trades[0].exit_price == Decimal("14")


def test_an_order_the_cash_cant_cover_is_rejected_at_its_fill() -> None:
    all_in = {"type": "percent_of_equity", "percent": "100"}
    # Sized for 10000 at a close of 11; the next open is higher, so it costs more.
    bars = _bars(("9", "11"), ("11.5", "12"), ("11.9", "12"))

    result = run_backtest(_definition(sizing=all_in), bars, CASH)

    first, second = result.orders
    assert (first.status, first.rejection) == ("rejected", "insufficient_cash")
    # Still flat, so the entry rule is asked again; an open under the close fits.
    assert (second.placed_on, second.status) == (bars[1].date, "filled")
    assert len(result.trades) == 1
    assert all(point.cash >= 0 for point in result.equity_curve)


def test_an_amount_that_buys_no_shares_makes_no_order_to_fill() -> None:
    tiny = {"type": "fixed_notional", "amount": "0.01"}
    bars = _bars(("90000", "99999"), ("99999", "99999"))

    result = run_backtest(_definition(sizing=tiny), bars, CASH)

    assert [(order.status, order.rejection) for order in result.orders] == [
        ("rejected", "unsized"),
        ("rejected", "unsized"),
    ]


def test_every_condition_sees_every_bar() -> None:
    # The cross needs the bar before; `all` must not skip it there just
    # because the first condition was already false.
    definition = _definition(
        entry={
            "type": "all",
            "conditions": [
                _close("gt", "15"),
                {
                    "type": "cross",
                    "left": {"type": "bar", "field": "close"},
                    "direction": "above",
                    "right": {"type": "constant", "value": "10"},
                },
            ],
        }
    )
    first, second = _bars(("5", "5"), ("20", "20"))
    compiled = Strategy(definition)

    assert compiled.on_bar(first, None) is None
    signal = compiled.on_bar(second, None)
    assert signal is not None and signal.side == "buy"


def test_a_series_out_of_order_is_refused() -> None:
    first, second = _bars(("9", "9"), ("9", "9"))

    with pytest.raises(ValueError, match="out of order"):
        run_backtest(_definition(), [second, first], CASH)


# --- The golden file ---------------------------------------------------------

GOLDEN = Path(__file__).parent / "golden" / "sma_crossover.json"


def _wave(count: int) -> list[Bar]:
    """A made-up series in whole cents: a 40-bar triangle wave on a slow
    climb, with a little repeatable noise. Integer arithmetic only."""
    bars = []
    previous = 10_000
    for index in range(count):
        swing = abs(index % 40 - 20) * 60
        close = 9_400 + swing + index * 3 + (index * 7919) % 53
        open_ = previous + (index * 104_729) % 31 - 15
        high = max(open_, close) + (index * 31) % 40
        low = min(open_, close) - (index * 17) % 40
        day = START + timedelta(days=index)
        o, h, l, c = (Decimal(value) / 100 for value in (open_, high, low, close))  # noqa: E741
        bars.append(Bar(day, o, h, l, c, Decimal(1_000_000 + index)))
        previous = close
    return bars


def _document(result: BacktestResult) -> str:
    # Any: the result as JSON, every number and date as text.
    def plain(value: Any) -> Any:
        if isinstance(value, Decimal | date):
            return str(value)
        if isinstance(value, dict):
            return {key: plain(item) for key, item in value.items()}
        if isinstance(value, list):
            return [plain(item) for item in value]
        return value

    return json.dumps(plain(dataclasses.asdict(result)), indent=2) + "\n"


def _golden_run() -> str:
    # The shared fixture's crossover, with averages short enough to cross
    # several times in 200 bars.
    document = strategy("sma crossover")
    for rule in (document["entry"], document["exit"]):
        rule["left"]["period"], rule["right"]["period"] = 5, 15
    definition = parse_strategy(document)
    costs = FillCosts(5, Decimal("1.00"), Decimal("0.005"))
    return _document(run_backtest(definition, _wave(200), BacktestConfig(Decimal("25000"), costs)))


def test_the_same_strategy_and_data_give_byte_identical_results() -> None:
    """Phase 5's exit criterion. `UPDATE_GOLDEN=1 uv run pytest` rewrites the
    file after a change that is meant to move the numbers; read its diff."""
    produced = _golden_run()
    if os.environ.get("UPDATE_GOLDEN"):
        GOLDEN.write_bytes(produced.encode())

    assert produced.encode() == GOLDEN.read_bytes()
    # A different ambient precision is the likeliest way to drift.
    with localcontext() as context:
        context.prec = 9
        assert _golden_run() == produced
    assert '"exit_reason": "exit"' in produced
