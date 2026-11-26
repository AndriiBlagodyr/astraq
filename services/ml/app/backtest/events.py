"""The events the backtest loop passes between its parts.

A trading day is two events, in this order:

1. `SessionEvent`: the session trades. Only the broker hears it; orders that
   were resting before the session meet its prices.
2. `BarEvent`: the session is over and its bar is known. The portfolio marks
   its position and the strategy decides.

A decision made on a `BarEvent` becomes an order after that day's
`SessionEvent` has been handled, so the first prices it can meet are the next
day's. That ordering is the look-ahead guard (ADR 0008): there is no code
path from a bar's close back to its own open.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Literal

from app.backtest.fill_model import Fill, FillOrder

# What made the strategy act: its entry rule, its exit rule, the stop, or the target.
SignalReason = Literal["entry", "exit", "stop_loss", "take_profit"]


@dataclass(frozen=True, slots=True)
class Bar:
    """One session of one symbol."""

    date: date
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal


@dataclass(frozen=True, slots=True)
class Order:
    id: int
    # The bar whose close the order was decided on.
    placed_on: date
    reason: SignalReason
    details: FillOrder


@dataclass(frozen=True, slots=True)
class SessionEvent:
    bar: Bar


@dataclass(frozen=True, slots=True)
class BarEvent:
    bar: Bar


@dataclass(frozen=True, slots=True)
class SignalEvent:
    """The strategy wants in (`buy`) or out (`sell`), as of `bar`'s close."""

    bar: Bar
    side: Literal["buy", "sell"]
    reason: SignalReason


@dataclass(frozen=True, slots=True)
class OrderEvent:
    order: Order


@dataclass(frozen=True, slots=True)
class FillEvent:
    order: Order
    # The session the order filled in.
    date: date
    fill: Fill


Event = SessionEvent | BarEvent | SignalEvent | OrderEvent | FillEvent
