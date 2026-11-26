"""Indicators, computed one bar at a time.

Each is a small state machine: `update` takes the newest value and returns
the indicator for that bar, or None while it has seen too few bars. There is
no array of prices to index into, so an indicator can't read a bar that
hasn't happened (the point-in-time rule, by construction).

Written by hand rather than taken from a TA library: the formulas fit in a
few lines each, and the smoothing and seeding choices (which differ between
libraries) are stated here instead of inherited.
"""

from __future__ import annotations

from collections import deque
from decimal import Decimal

from app.backtest.numbers import HUNDRED, ZERO


class Sma:
    """Simple moving average: the mean of the last `period` values."""

    def __init__(self, period: int) -> None:
        self._period = period
        self._window: deque[Decimal] = deque()
        self._sum = ZERO

    def update(self, value: Decimal) -> Decimal | None:
        self._window.append(value)
        self._sum += value
        if len(self._window) > self._period:
            self._sum -= self._window.popleft()
        if len(self._window) < self._period:
            return None
        return self._sum / self._period


class Ema:
    """Exponential moving average with weight 2 / (period + 1).

    The first value is the simple average of the first `period` values, so
    the EMA starts on the same bar as the SMA of that period.
    """

    def __init__(self, period: int) -> None:
        self._period = period
        self._weight = Decimal(2) / (period + 1)
        self._seed = Sma(period)
        self._value: Decimal | None = None

    def update(self, value: Decimal) -> Decimal | None:
        if self._value is None:
            self._value = self._seed.update(value)
        else:
            self._value += (value - self._value) * self._weight
        return self._value


class _WilderAverage:
    """Wilder's smoothing: the mean of the first `period` values, then
    `(previous × (period − 1) + value) / period`. An EMA with weight
    1 / period; RSI and ATR are both defined on it."""

    def __init__(self, period: int) -> None:
        self._period = period
        self._count = 0
        self._sum = ZERO
        self._value: Decimal | None = None

    def update(self, value: Decimal) -> Decimal | None:
        if self._value is None:
            self._count += 1
            self._sum += value
            if self._count == self._period:
                self._value = self._sum / self._period
        else:
            self._value = (self._value * (self._period - 1) + value) / self._period
        return self._value


class Rsi:
    """Relative strength index, 0 to 100, over `period` changes (so it needs
    `period + 1` values).

    `100 − 100 / (1 + average gain / average loss)`, both averages Wilder's.
    No losses in the window is 100; no movement at all is 50.
    """

    def __init__(self, period: int) -> None:
        self._gains = _WilderAverage(period)
        self._losses = _WilderAverage(period)
        self._previous: Decimal | None = None

    def update(self, value: Decimal) -> Decimal | None:
        previous, self._previous = self._previous, value
        if previous is None:
            return None
        change = value - previous
        gain = self._gains.update(max(change, ZERO))
        loss = self._losses.update(max(-change, ZERO))
        if gain is None or loss is None:
            return None
        if loss == 0:
            return Decimal(50) if gain == 0 else HUNDRED
        return HUNDRED - HUNDRED / (1 + gain / loss)


class Atr:
    """Average true range: Wilder's average of each bar's true range, the
    largest of high − low and the distances from the previous close to the
    high and to the low. The first bar has no previous close; its range is
    high − low."""

    def __init__(self, period: int) -> None:
        self._average = _WilderAverage(period)
        self._previous_close: Decimal | None = None

    def update(self, high: Decimal, low: Decimal, close: Decimal) -> Decimal | None:
        previous, self._previous_close = self._previous_close, close
        true_range = high - low
        if previous is not None:
            true_range = max(true_range, abs(high - previous), abs(low - previous))
        return self._average.update(true_range)


class Bollinger:
    """Bollinger bands: the simple average of the last `period` values and
    the bands `deviations` standard deviations either side of it. The
    deviation is the population one (divide by `period`), as Bollinger
    defines the bands."""

    def __init__(self, period: int, deviations: Decimal) -> None:
        self._period = period
        self._deviations = deviations
        self._window: deque[Decimal] = deque(maxlen=period)

    def update(self, value: Decimal) -> tuple[Decimal, Decimal, Decimal] | None:
        """(lower, middle, upper) for this bar."""
        self._window.append(value)
        if len(self._window) < self._period:
            return None
        # Summed from the window each bar: a running sum of squares would
        # carry rounding from bar to bar.
        middle = sum(self._window, ZERO) / self._period
        variance = sum(((item - middle) ** 2 for item in self._window), ZERO) / self._period
        width = variance.sqrt() * self._deviations
        return middle - width, middle, middle + width
