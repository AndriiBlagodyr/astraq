"""The fill model shared with paper trading (ADR 0008), ported from
`apps/api/src/trading/fill-model.ts`.

Pure functions: given an order and the prices it meets, they say whether it
fills, at what price, and what it costs. Nothing here knows about time; the
engine decides which bar an order may see.

The cases in `packages/shared/fixtures/fill-model.json` are the contract.
Both implementations run them, so a change to a rule is a change to that
file first, then to both languages.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

from app.backtest.numbers import (
    CASH_PLACES,
    PRICE_PLACES,
    QUANTITY_PLACES,
    ROUND_CEILING,
    ROUND_FLOOR,
    exact,
    places,
    quantize,
)

OrderSide = Literal["buy", "sell"]
OrderType = Literal["market", "limit"]
# Why the order filled at this price:
# - market_open: a market order at the session's open
# - market_last: a market order at the latest known price, mid-session
# - limit_open: a limit order the open had already passed
# - limit_cross: a limit order the session traded through
FillRule = Literal["market_open", "market_last", "limit_open", "limit_cross"]

MAX_SLIPPAGE_BPS = 1000


@dataclass(frozen=True, slots=True)
class FillOrder:
    side: OrderSide
    type: OrderType
    # Shares, above zero, up to 6 decimal places.
    quantity: Decimal
    # Required for a limit order; ignored for a market order.
    limit_price: Decimal | None = None


@dataclass(frozen=True, slots=True)
class FillBar:
    """One session's raw (unadjusted) prices."""

    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal


@dataclass(frozen=True, slots=True)
class FillCosts:
    # Slippage on market-priced fills, in basis points (1 bp = 0.01%).
    slippage_bps: int
    # Charged once per filled order.
    commission_per_order: Decimal
    # Charged per share filled.
    commission_per_share: Decimal


@dataclass(frozen=True, slots=True)
class Fill:
    rule: FillRule
    # Per share, 6 decimal places.
    price: Decimal
    # quantity × price, in cents. Never includes the commission.
    notional: Decimal
    # In cents.
    commission: Decimal


def _positive(value: Decimal | None, name: str, max_places: int) -> Decimal:
    if value is None or not value.is_finite() or value <= 0:
        raise ValueError(f"{name} must be above zero")
    if places(value) > max_places:
        raise ValueError(f"{name} has more than {max_places} decimal places")
    return value


def _non_negative(value: Decimal, name: str) -> Decimal:
    if not value.is_finite() or value < 0:
        raise ValueError(f"{name} must not be negative")
    return value


def _slip(price: Decimal, side: OrderSide, slippage_bps: int) -> Decimal:
    """A market price moved against the trader by the slippage: up for a buy,
    down for a sell. The leftover digits round against the trader too."""
    # `bool` is an `int` in Python; True must not pass for 1 bp.
    if type(slippage_bps) is not int or not 0 <= slippage_bps <= MAX_SLIPPAGE_BPS:
        raise ValueError(f"slippage_bps must be a whole number from 0 to {MAX_SLIPPAGE_BPS}")
    buying = side == "buy"
    factor = Decimal(10_000 + slippage_bps if buying else 10_000 - slippage_bps) / 10_000
    return quantize(price * factor, PRICE_PLACES, ROUND_CEILING if buying else ROUND_FLOOR)


def _fill(rule: FillRule, price: Decimal, quantity: Decimal, costs: FillCosts) -> Fill:
    commission = (
        _non_negative(costs.commission_per_order, "commission_per_order")
        + _non_negative(costs.commission_per_share, "commission_per_share") * quantity
    )
    return Fill(
        rule=rule,
        price=quantize(price, PRICE_PLACES),
        notional=quantize(quantity * price, CASH_PLACES),
        commission=quantize(commission, CASH_PLACES),
    )


@exact
def fill_on_bar(order: FillOrder, bar: FillBar, costs: FillCosts) -> Fill | None:
    """The order against one session's bar, or None when it doesn't fill.

    The caller passes only a bar whose session opened after the order was
    placed. That one rule is the look-ahead guard: an order never fills on
    prices that existed before it did.

    - Market: fills at the open, plus slippage.
    - Limit: if the open is already past the limit, fills at the open plus
      slippage, but never worse than the limit. Otherwise fills at the limit
      when the session trades through it. A bar that only touches the limit
      doesn't fill: a real order at that price waits in a queue.
    """
    quantity = _positive(order.quantity, "quantity", QUANTITY_PLACES)
    open_ = _positive(bar.open, "open", PRICE_PLACES)
    buying = order.side == "buy"

    if order.type == "market":
        return _fill("market_open", _slip(open_, order.side, costs.slippage_bps), quantity, costs)

    limit = _positive(order.limit_price, "limit_price", PRICE_PLACES)
    open_passed_limit = open_ < limit if buying else open_ > limit
    if open_passed_limit:
        slipped = _slip(open_, order.side, costs.slippage_bps)
        worse_than_limit = slipped > limit if buying else slipped < limit
        return _fill("limit_open", limit if worse_than_limit else slipped, quantity, costs)

    traded_through = (
        _positive(bar.low, "low", PRICE_PLACES) < limit
        if buying
        else _positive(bar.high, "high", PRICE_PLACES) > limit
    )
    return _fill("limit_cross", limit, quantity, costs) if traded_through else None


@exact
def fill_at_last_price(order: FillOrder, last_price: Decimal, costs: FillCosts) -> Fill | None:
    """A market order placed while the market is open: the latest known price
    plus slippage. A limit order never fills here.

    The backtester never takes this branch (its orders are made after a bar
    closes and fill by `market_open`); it is ported because the fixtures
    cover it, and the contract is the whole file.
    """
    if order.type != "market":
        return None
    quantity = _positive(order.quantity, "quantity", QUANTITY_PLACES)
    last = _positive(last_price, "last_price", PRICE_PLACES)
    return _fill("market_last", _slip(last, order.side, costs.slippage_bps), quantity, costs)


@exact
def quoted_price(side: OrderSide, last_price: Decimal, costs: FillCosts) -> Decimal:
    """The price per share a market order is estimated at before it has a
    size: the latest known price with slippage (`quotedPrice` in the api)."""
    return _slip(_positive(last_price, "last_price", PRICE_PLACES), side, costs.slippage_bps)


@exact
def shares_for(amount: Decimal, side: OrderSide, last_price: Decimal, costs: FillCosts) -> Decimal:
    """The shares a dollar amount comes to at the quoted price, rounded down
    to a millionth of a share (`sharesFor` in `apps/api/src/trading/risk.ts`,
    which sizes a paper order asked for in dollars). Zero when the amount
    buys less than a millionth."""
    if not amount.is_finite() or amount <= 0:
        raise ValueError("amount must be above zero")
    return quantize(amount / quoted_price(side, last_price, costs), QUANTITY_PLACES, ROUND_FLOOR)
