"""The event-driven backtester (ROADMAP Phase 5 item 2), built by hand.

One loop, one queue, four parts that only talk through events:

    bars ─► SessionEvent ─► Broker ─► FillEvent ─► Portfolio
         └► BarEvent ─► Portfolio (mark) ─► Strategy ─► SignalEvent
                        SignalEvent ─► Portfolio (size) ─► OrderEvent ─► Broker

The broker fills with the fill model paper trading uses (`fill_model.py`,
ADR 0008), and the portfolio refuses what the paper ledger refuses: no
buying on credit, no selling what isn't held. An order decided on one bar
first meets the next bar's session (see `events.py`).

Scope of this version: one symbol, long-only, market orders, one price
series. Signals and fills read the same bars; adjusted prices for signals
with raw prices and corporate actions for fills come with Phase 5 item 3.
"""

from __future__ import annotations

from collections import deque
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Literal

from app.backtest.events import (
    Bar,
    BarEvent,
    Event,
    FillEvent,
    Order,
    OrderEvent,
    SessionEvent,
    SignalEvent,
    SignalReason,
)
from app.backtest.fill_model import Fill, FillBar, FillCosts, FillOrder, fill_on_bar, shares_for
from app.backtest.numbers import (
    CASH_PLACES,
    HUNDRED,
    ROUND_FLOOR,
    ZERO,
    exact,
    places,
    quantize,
)
from app.backtest.strategy import Position, Strategy
from app.contracts.strategy import FixedNotionalSizing, PositionSizing, StrategyDefinition

OrderStatus = Literal["open", "filled", "rejected"]
# Why an order ended without a fill. The first two are the paper ledger's
# refusals at the fill; `unsized` is the api's refusal at placement, for an
# amount that buys less than a millionth of a share.
RejectionReason = Literal["insufficient_cash", "too_small", "unsized"]

FREE = FillCosts(slippage_bps=0, commission_per_order=ZERO, commission_per_share=ZERO)


@dataclass(frozen=True, slots=True)
class BacktestConfig:
    starting_cash: Decimal
    costs: FillCosts = FREE


@dataclass(slots=True)
class OrderRecord:
    """An order and what became of it."""

    id: int
    placed_on: date
    side: Literal["buy", "sell"]
    reason: SignalReason
    quantity: Decimal
    status: OrderStatus = "open"
    rejection: RejectionReason | None = None
    filled_on: date | None = None
    fill: Fill | None = None


@dataclass(slots=True)
class Trade:
    """A round trip: one entry, and its exit once there is one."""

    quantity: Decimal
    entry_date: date
    entry_price: Decimal
    # What the entry took from cash: notional plus commission.
    cost: Decimal
    exit_date: date | None = None
    exit_price: Decimal | None = None
    exit_reason: SignalReason | None = None
    # Proceeds less commission, less `cost`. None while the trade is open.
    pnl: Decimal | None = None


@dataclass(frozen=True, slots=True)
class EquityPoint:
    """The portfolio at a bar's close."""

    date: date
    cash: Decimal
    # Shares held at the close, in cents.
    position_value: Decimal
    equity: Decimal


@dataclass(frozen=True, slots=True)
class BacktestResult:
    orders: list[OrderRecord]
    trades: list[Trade]
    equity_curve: list[EquityPoint]

    @property
    def final_equity(self) -> Decimal | None:
        return self.equity_curve[-1].equity if self.equity_curve else None


class Broker:
    """Holds the orders waiting for a session and fills them when one comes."""

    def __init__(self, costs: FillCosts) -> None:
        self._costs = costs
        self._resting: list[Order] = []

    def submit(self, order: Order) -> None:
        self._resting.append(order)

    def on_session(self, bar: Bar) -> list[FillEvent]:
        prices = FillBar(open=bar.open, high=bar.high, low=bar.low, close=bar.close)
        fills: list[FillEvent] = []
        waiting: list[Order] = []
        for order in self._resting:
            fill = fill_on_bar(order.details, prices, self._costs)
            if fill is None:
                waiting.append(order)
            else:
                fills.append(FillEvent(order, bar.date, fill))
        self._resting = waiting
        return fills


@dataclass(slots=True)
class Portfolio:
    """Cash and at most one position, with the record of how they got there."""

    cash: Decimal
    costs: FillCosts
    sizing: PositionSizing
    quantity: Decimal = ZERO
    orders: dict[int, OrderRecord] = field(default_factory=dict)
    trades: list[Trade] = field(default_factory=list)
    equity_curve: list[EquityPoint] = field(default_factory=list)

    @property
    def position(self) -> Position | None:
        if self.quantity == 0:
            return None
        trade = self.trades[-1]
        return Position(self.quantity, trade.entry_price, trade.entry_date)

    def mark(self, bar: Bar) -> None:
        value = quantize(self.quantity * bar.close, CASH_PLACES)
        self.equity_curve.append(EquityPoint(bar.date, self.cash, value, self.cash + value))

    def on_signal(self, signal: SignalEvent) -> OrderEvent | None:
        """Sizes the signal into a market order for the next session.

        A market order is over, filled or rejected, by the next bar's close,
        so no order is ever waiting when a signal arrives.
        """
        bar = signal.bar
        quantity = self.quantity if signal.side == "sell" else self._entry_size(bar)
        record = OrderRecord(
            id=len(self.orders) + 1,
            placed_on=bar.date,
            side=signal.side,
            reason=signal.reason,
            quantity=quantity,
        )
        self.orders[record.id] = record
        if quantity == 0:
            record.status, record.rejection = "rejected", "unsized"
            return None
        details = FillOrder(side=signal.side, type="market", quantity=quantity)
        return OrderEvent(Order(record.id, bar.date, signal.reason, details))

    def _entry_size(self, bar: Bar) -> Decimal:
        """Shares for an entry, the way a paper order asked for in dollars is
        sized: at the latest close with slippage, rounded down."""
        spec = self.sizing.root
        if isinstance(spec, FixedNotionalSizing):
            amount = Decimal(spec.amount)
        else:
            equity = self.equity_curve[-1].equity
            amount = quantize(equity * Decimal(spec.percent) / HUNDRED, CASH_PLACES, ROUND_FLOOR)
        return shares_for(amount, "buy", bar.close, self.costs) if amount > 0 else ZERO

    def on_fill(self, event: FillEvent) -> None:
        """Books a fill, or rejects the order when the books can't take it."""
        record, fill = self.orders[event.order.id], event.fill

        def reject(reason: RejectionReason) -> None:
            record.status, record.rejection = "rejected", reason

        if fill.notional == 0:
            return reject("too_small")
        if record.side == "buy":
            cost = fill.notional + fill.commission
            if cost > self.cash:
                return reject("insufficient_cash")
            self.cash -= cost
            self.quantity = record.quantity
            self.trades.append(Trade(record.quantity, event.date, fill.price, cost))
        else:
            proceeds = fill.notional - fill.commission
            if self.cash + proceeds < 0:
                return reject("insufficient_cash")
            self.cash += proceeds
            self.quantity = ZERO
            trade = self.trades[-1]
            trade.exit_date, trade.exit_price = event.date, fill.price
            trade.exit_reason, trade.pnl = record.reason, proceeds - trade.cost
        record.status, record.filled_on, record.fill = "filled", event.date, fill
        return None


def _checked(bars: Iterable[Bar]) -> Iterable[Bar]:
    """Bars as given, refusing a series that isn't one: dates must rise."""
    previous: date | None = None
    for bar in bars:
        if previous is not None and bar.date <= previous:
            raise ValueError(f"Bars out of order: {bar.date} after {previous}")
        previous = bar.date
        yield bar


@exact
def run_backtest(
    definition: StrategyDefinition, bars: Iterable[Bar], config: BacktestConfig
) -> BacktestResult:
    """Runs one strategy over one symbol's bars, oldest first.

    `bars` is consumed one at a time and nothing downstream keeps a
    reference to the iterable: the strategy can't see a bar before the loop
    hands it over. The same strategy, bars, and config give the same result
    to the last digit; there is no clock and no randomness in here.
    """
    if config.starting_cash < 0 or places(config.starting_cash) > CASH_PLACES:
        raise ValueError("starting_cash must be zero or more, in cents")

    strategy = Strategy(definition)
    broker = Broker(config.costs)
    portfolio = Portfolio(cash=config.starting_cash, costs=config.costs, sizing=definition.sizing)
    queue: deque[Event] = deque()

    for bar in _checked(bars):
        queue.append(SessionEvent(bar))
        queue.append(BarEvent(bar))
        while queue:
            event = queue.popleft()
            match event:
                case SessionEvent():
                    # Fills go to the front: they happened during the
                    # session, before the BarEvent that says it is over.
                    queue.extendleft(reversed(broker.on_session(event.bar)))
                case FillEvent():
                    portfolio.on_fill(event)
                case BarEvent():
                    portfolio.mark(event.bar)
                    signal = strategy.on_bar(event.bar, portfolio.position)
                    if signal is not None:
                        queue.append(signal)
                case SignalEvent():
                    order = portfolio.on_signal(event)
                    if order is not None:
                        queue.append(order)
                case OrderEvent():
                    broker.submit(event.order)

    return BacktestResult(
        orders=list(portfolio.orders.values()),
        trades=portfolio.trades,
        equity_curve=portfolio.equity_curve,
    )
