"""Turns a strategy document (ADR 0012) into something that can be asked,
bar by bar, "in or out?".

The document is a tree: conditions over series. Compiling it builds one
small object per node, each holding its own indicator state. Every node is
updated on every bar, whether or not its answer is needed, because an
indicator that skips a bar is no longer the indicator.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Protocol

from app.backtest.events import Bar, SignalEvent
from app.backtest.indicators import Atr, Bollinger, Ema, Rsi, Sma
from app.backtest.numbers import HUNDRED
from app.contracts.strategy import (
    AllCondition,
    AnyCondition,
    AtrSeries,
    BarSeries,
    BollingerSeries,
    CompareCondition,
    ConstantSeries,
    CrossCondition,
    EmaSeries,
    RsiSeries,
    SmaSeries,
    StrategyCondition,
    StrategyDefinition,
    StrategySeries,
)

# A value for this bar, or None while an indicator is warming up.
Series = Callable[[Bar], Decimal | None]


class Condition(Protocol):
    def update(self, bar: Bar) -> bool:
        """Whether the condition holds on `bar`. Call once per bar, in order."""
        ...


def _field(name: str) -> Callable[[Bar], Decimal]:
    def read(bar: Bar) -> Decimal:
        value: Decimal = getattr(bar, name)
        return value

    return read


def _series(node: StrategySeries) -> Series:
    spec = node.root
    match spec:
        case BarSeries():
            return _field(spec.field)
        case ConstantSeries():
            constant = Decimal(spec.value)
            return lambda _bar: constant
        case SmaSeries():
            sma, source = Sma(spec.period), _field(spec.source.root)
            return lambda bar: sma.update(source(bar))
        case EmaSeries():
            ema, source = Ema(spec.period), _field(spec.source.root)
            return lambda bar: ema.update(source(bar))
        case RsiSeries():
            rsi = Rsi(spec.period)
            return lambda bar: rsi.update(bar.close)
        case AtrSeries():
            atr = Atr(spec.period)
            return lambda bar: atr.update(bar.high, bar.low, bar.close)
        case BollingerSeries():
            bands = Bollinger(spec.period, Decimal(spec.deviations))
            index = ("lower", "middle", "upper").index(spec.band)

            def band(bar: Bar) -> Decimal | None:
                values = bands.update(bar.close)
                return None if values is None else values[index]

            return band


_OPERATORS: dict[str, Callable[[Decimal, Decimal], bool]] = {
    "gt": lambda left, right: left > right,
    "gte": lambda left, right: left >= right,
    "lt": lambda left, right: left < right,
    "lte": lambda left, right: left <= right,
}


class _Compare:
    def __init__(self, spec: CompareCondition) -> None:
        self._left = _series(spec.left)
        self._right = _series(spec.right)
        self._holds = _OPERATORS[spec.operator]

    def update(self, bar: Bar) -> bool:
        left, right = self._left(bar), self._right(bar)
        return left is not None and right is not None and self._holds(left, right)


class _Cross:
    """True on the bar `left` moves from one side of `right` to the other.
    Being equal on the bar before counts as not yet across."""

    def __init__(self, spec: CrossCondition) -> None:
        self._left = _series(spec.left)
        self._right = _series(spec.right)
        self._above = spec.direction == "above"
        self._previous: tuple[Decimal, Decimal] | None = None

    def update(self, bar: Bar) -> bool:
        left, right = self._left(bar), self._right(bar)
        previous = self._previous
        self._previous = None if left is None or right is None else (left, right)
        if previous is None or left is None or right is None:
            return False
        was_left, was_right = previous
        if self._above:
            return was_left <= was_right and left > right
        return was_left >= was_right and left < right


class _Group:
    def __init__(self, spec: AllCondition | AnyCondition) -> None:
        self._children = [_condition(child) for child in spec.conditions]
        self._combine: Callable[[list[bool]], bool] = all if spec.type == "all" else any

    def update(self, bar: Bar) -> bool:
        # A list, not a generator: `all` on a generator stops at the first
        # False and the children after it would miss the bar.
        return self._combine([child.update(bar) for child in self._children])


def _condition(node: StrategyCondition) -> Condition:
    spec = node.root
    match spec:
        case CompareCondition():
            return _Compare(spec)
        case CrossCondition():
            return _Cross(spec)
        case AllCondition() | AnyCondition():
            return _Group(spec)


def parse_strategy(document: object) -> StrategyDefinition:
    """A strategy document as it came off the wire, validated.

    Strict: Pydantic's default would read the text "20" as the period 20,
    which the Zod schema refuses, and the two must agree on what a valid
    document is (`packages/shared/fixtures/strategies.json`).
    """
    return StrategyDefinition.model_validate(document, strict=True)


@dataclass(frozen=True, slots=True)
class Position:
    """What the portfolio holds, as the strategy sees it."""

    quantity: Decimal
    # Per share, as filled: with slippage, without commission.
    entry_price: Decimal
    entry_date: date


class Strategy:
    """A compiled strategy. Long-only: flat or in one position."""

    def __init__(self, definition: StrategyDefinition) -> None:
        self._entry = _condition(definition.entry)
        self._exit = None if definition.exit is None else _condition(definition.exit)
        stop, target = definition.stopLoss, definition.takeProfit
        self._stop = None if stop is None else 1 - Decimal(stop.percent) / HUNDRED
        self._target = None if target is None else 1 + Decimal(target.percent) / HUNDRED

    def on_bar(self, bar: Bar, position: Position | None) -> SignalEvent | None:
        """The decision at `bar`'s close. `position` is None while flat."""
        # Both rules see every bar, whichever one is being listened to.
        enter = self._entry.update(bar)
        leave = self._exit is not None and self._exit.update(bar)

        if position is None:
            return SignalEvent(bar, "buy", "entry") if enter else None
        # The stop and the target are measured from the entry fill, at the
        # close: an exit like any other, not an order resting in the market.
        if self._stop is not None and bar.close <= position.entry_price * self._stop:
            return SignalEvent(bar, "sell", "stop_loss")
        if self._target is not None and bar.close >= position.entry_price * self._target:
            return SignalEvent(bar, "sell", "take_profit")
        return SignalEvent(bar, "sell", "exit") if leave else None
