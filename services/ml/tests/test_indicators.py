from __future__ import annotations

from decimal import Decimal

from app.backtest.indicators import Atr, Bollinger, Ema, Rsi, Sma

# Each expected value below was worked out by hand from the definition in
# the indicator's docstring.


def _d(*values: str) -> list[Decimal]:
    return [Decimal(value) for value in values]


def test_sma_is_the_mean_of_the_last_period_values() -> None:
    sma = Sma(3)

    assert [sma.update(value) for value in _d("1", "2", "3", "4", "5")] == [
        None,
        None,
        Decimal("2"),
        Decimal("3"),
        Decimal("4"),
    ]


def test_ema_starts_at_the_simple_average_then_weighs_by_two_over_period_plus_one() -> None:
    ema = Ema(3)

    # Seed (1+2+3)/3 = 2; weight 2/4: 2 + (4-2)/2 = 3, 3 + (5-3)/2 = 4, 4 + (9-4)/2 = 6.5.
    assert [ema.update(value) for value in _d("1", "2", "3", "4", "5", "9")] == [
        None,
        None,
        Decimal("2"),
        Decimal("3"),
        Decimal("4"),
        Decimal("6.5"),
    ]


def test_rsi_uses_wilders_smoothing() -> None:
    rsi = Rsi(2)
    values = [rsi.update(value) for value in _d("10", "11", "10", "12", "12")]

    # Changes +1, -1: gain 0.5, loss 0.5, RS 1.
    assert values[:3] == [None, None, Decimal("50")]
    # +2: gain (0.5 + 2)/2 = 1.25, loss 0.25, RS 5: 100 - 100/6.
    assert values[3] is not None
    assert round(values[3], 6) == Decimal("83.333333")
    # 0: gain 0.625, loss 0.125, RS 5 again.
    assert values[4] is not None
    assert round(values[4], 6) == Decimal("83.333333")


def test_rsi_without_losses_is_100_and_without_movement_is_50() -> None:
    rising = Rsi(2)
    flat = Rsi(2)

    assert [rising.update(value) for value in _d("1", "2", "3")][-1] == Decimal("100")
    assert [flat.update(value) for value in _d("5", "5", "5")][-1] == Decimal("50")


def test_atr_measures_from_the_previous_close() -> None:
    atr = Atr(2)

    assert atr.update(Decimal("10"), Decimal("8"), Decimal("9")) is None
    # A gap up: high - low is 1, but the bar is 3 above the last close.
    assert atr.update(Decimal("12"), Decimal("11"), Decimal("11")) == Decimal("2.5")
    # Range 2 from a close of 11: (2.5 × 1 + 2) / 2.
    assert atr.update(Decimal("12"), Decimal("10"), Decimal("11")) == Decimal("2.25")


def test_bollinger_bands_sit_population_deviations_from_the_mean() -> None:
    bands = Bollinger(4, Decimal("2"))

    for value in _d("2", "4", "4"):
        assert bands.update(value) is None
    # Mean 4, squared distances 4 + 0 + 0 + 4 over 4: deviation √2.
    result = bands.update(Decimal("6"))
    assert result is not None
    lower, middle, upper = result
    assert middle == Decimal("4")
    assert round(upper, 6) == Decimal("6.828427")
    assert round(lower, 6) == Decimal("1.171573")
