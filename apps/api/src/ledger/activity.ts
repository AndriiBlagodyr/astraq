import {
  CASH_PLACES,
  ZERO,
  add,
  decimal,
  format,
  isZero,
  negate,
  round,
  sign,
  type Decimal,
} from '../common/decimal';
import type {
  LedgerAccount,
  LedgerKind,
  LedgerTransaction,
  SplitRatio,
} from './ledger';

// A portfolio's ledger as a readable history (ROADMAP Phase 3 item 6, the
// Activity tab): one line per transaction, saying what it was and what it
// did to cash. Pure, like the ledger itself. Nothing here decides anything:
// every figure is read off the entries `replay` has already audited, so the
// last line's `cashAfter` is the cash the Holdings tab shows.

/** A stored transaction with what the timeline shows beside its entries. */
export interface RecordedTransaction extends LedgerTransaction {
  /** When it took effect. */
  occurredAt: Date;
  /** The fill a buy or sell books; null on everything else. */
  fill: { orderId: string; price: string } | null;
}

/** One line of the history. Amounts are decimal strings, cash in cents. */
export interface ActivityLine {
  seq: number;
  kind: LedgerKind;
  occurredAt: Date;
  sessionDate: string;
  /** Null on a deposit or withdrawal. */
  symbolId: number | null;
  /** Shares bought or added by a split (positive), or sold (negative). */
  quantity: string | null;
  price: string | null;
  orderId: string | null;
  commission: string | null;
  /** A sell's gain or loss, before the commission. */
  realizedPnl: string | null;
  /** The dividend earned or paid. */
  dividend: string | null;
  split: SplitRatio | null;
  cashChange: string;
  cashAfter: string;
}

const cents = (value: Decimal) => format(round(value, CASH_PLACES));

/**
 * The history as lines, oldest first, with cash running through them.
 * `history` must be in `seq` order, as the repository reads it.
 */
export function timeline(
  history: readonly RecordedTransaction[],
): ActivityLine[] {
  let cash = ZERO;
  return history.map((transaction) => {
    // What the transaction moved into each account (debits positive).
    const moved = new Map<LedgerAccount, Decimal>();
    let symbolId: number | null = null;
    let shares = ZERO;
    for (const entry of transaction.entries) {
      moved.set(
        entry.account,
        add(moved.get(entry.account) ?? ZERO, decimal(entry.amount)),
      );
      symbolId ??= entry.symbolId;
      if (entry.account === 'securities') {
        shares = add(shares, decimal(entry.quantity));
      }
    }
    const into = (account: LedgerAccount) => moved.get(account) ?? ZERO;

    const cashChange = into('cash');
    cash = add(cash, cashChange);
    const { kind } = transaction;
    const trade = kind === 'buy' || kind === 'sell';
    const receivable = into('dividends_receivable');

    return {
      seq: transaction.seq,
      kind,
      occurredAt: transaction.occurredAt,
      sessionDate: transaction.date,
      symbolId,
      quantity: isZero(shares) ? null : format(shares),
      price: transaction.fill?.price ?? null,
      orderId: transaction.fill?.orderId ?? null,
      commission: trade ? cents(into('fees')) : null,
      // Income accounts grow with credits, so a gain is a negative entry.
      realizedPnl: kind === 'sell' ? cents(negate(into('realized_pnl'))) : null,
      dividend:
        kind === 'dividend' || kind === 'dividend_payment'
          ? cents(sign(receivable) < 0 ? negate(receivable) : receivable)
          : null,
      split: transaction.split ?? null,
      cashChange: cents(cashChange),
      cashAfter: cents(cash),
    };
  });
}
