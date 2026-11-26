"""Decimal arithmetic for the backtester.

Money is never a float (AGENTS.md), and here indicators aren't either: a
backtest must give the same bytes on every machine, and `Decimal` under a
fixed context does. Python's `Decimal` reads the ambient context, which a
caller can change, so every entry point of the engine runs under `exact`.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from decimal import (
    ROUND_CEILING,
    ROUND_FLOOR,
    ROUND_HALF_EVEN,
    ROUND_HALF_UP,
    Context,
    Decimal,
    localcontext,
)
from functools import wraps

# Decimal places the database keeps (apps/api/src/common/decimal.ts).
PRICE_PLACES = 6
QUANTITY_PLACES = 6
CASH_PLACES = 2

# 50 digits hold every product the fill model makes without rounding: a
# quantity (18 digits) times a price (16) is 34. The api's decimal is exact
# on bigint; this is exact for the same inputs. Only division rounds here,
# and only indicators divide before a `quantize` names the places.
ENGINE_CONTEXT = Context(prec=50, rounding=ROUND_HALF_EVEN)

_DECIMAL_PATTERN = re.compile(r"-?\d+(\.\d+)?\Z")

ZERO = Decimal(0)
HUNDRED = Decimal(100)

__all__ = [
    "CASH_PLACES",
    "ENGINE_CONTEXT",
    "HUNDRED",
    "PRICE_PLACES",
    "QUANTITY_PLACES",
    "ROUND_CEILING",
    "ROUND_FLOOR",
    "ROUND_HALF_UP",
    "ZERO",
    "exact",
    "parse_decimal",
    "places",
    "quantize",
]


def exact[**P, R](fn: Callable[P, R]) -> Callable[P, R]:
    """Runs `fn` under the engine's decimal context, whatever the caller's is."""

    @wraps(fn)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        with localcontext(ENGINE_CONTEXT):
            return fn(*args, **kwargs)

    return wrapper


def parse_decimal(value: str) -> Decimal:
    """A plain decimal string ("12", "-0.125"): no exponent, no NaN, no spaces."""
    if not _DECIMAL_PATTERN.match(value):
        raise ValueError(f'Not a decimal number: "{value}"')
    return Decimal(value)


def places(value: Decimal) -> int:
    """Decimal places as written: 2 for 1.50."""
    exponent = value.as_tuple().exponent
    if not isinstance(exponent, int):
        raise ValueError(f"Not a finite number: {value}")
    return max(0, -exponent)


def quantize(value: Decimal, decimal_places: int, rounding: str = ROUND_HALF_UP) -> Decimal:
    """`value` at exactly `decimal_places` places. Half up is a tie away from zero."""
    return value.quantize(Decimal(1).scaleb(-decimal_places), rounding=rounding)
