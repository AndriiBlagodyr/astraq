import { format } from '../common/decimal';
import {
  EMPTY_LEDGER,
  apply,
  buy,
  deposit,
  type LedgerState,
} from '../ledger/ledger';
import { assess, estimate, type RiskInput, type RiskOrder } from './risk';

const NVDA = 7;
const KO = 8;
const COSTS = {
  slippageBps: 0,
  commissionPerOrder: '1',
  commissionPerShare: '0',
};

/** 10000 paid in, then 10 NVDA bought for 1000: 8999 cash after the commission. */
function books(): LedgerState {
  let state = apply(EMPTY_LEDGER, { seq: 1, date: '2026-06-01', ...deposit('10000') });
  state = apply(state, {
    seq: 2,
    date: '2026-06-01',
    ...buy(state, { symbolId: NVDA, quantity: '10', notional: '1000.00', commission: '1.00' }),
  });
  return state;
}

const order = (parts: Partial<RiskOrder>): RiskOrder => ({
  symbolId: NVDA,
  side: 'buy',
  type: 'market',
  quantity: '10',
  limitPrice: null,
  ...parts,
});

const check = (request: Partial<RiskOrder>, parts: Partial<RiskInput> = {}) =>
  assess({
    state: books(),
    open: [],
    request: order(request),
    prices: new Map([
      [NVDA, '100'],
      [KO, '50'],
    ]),
    costs: COSTS,
    maxOrderNotional: null,
    ...parts,
  });

describe('estimate', () => {
  it('prices a market order at the last close with slippage, a limit order at its limit', () => {
    const slipped = { ...COSTS, slippageBps: 100 };
    expect(estimate(order({}), '100', slipped)).toMatchObject({
      price: '101.000000',
      notional: '1010.00',
      commission: '1.00',
    });
    expect(
      estimate(order({ type: 'limit', limitPrice: '90' }), '100', slipped),
    ).toMatchObject({ price: '90.000000', notional: '900.00' });
    // No bar, no estimate; a limit order doesn't need one.
    expect(estimate(order({}), undefined, COSTS)).toBeNull();
    expect(estimate(order({ type: 'limit', limitPrice: '90' }), undefined, COSTS)).not.toBeNull();
  });
});

describe('assess', () => {
  it('lets in an order the cash covers, and says what is left', () => {
    const { refusal, cashAfter } = check({ quantity: '89' });
    expect(refusal).toBeNull();
    // 8999 less 89 shares at 100 and the commission of 1.
    expect(format(cashAfter!)).toBe('98.00');
  });

  it('refuses a buy the cash does not cover, commission included', () => {
    // 8999 cash: 89.98 shares come to 8998 and fit; 89.99 need 9000.
    expect(check({ quantity: '89.98' }).refusal).toBeNull();
    expect(check({ quantity: '89.99' }).refusal).toMatchObject({ code: 'insufficient_cash' });
  });

  it('counts what open buy orders are expected to take', () => {
    const open = [
      // A limit order is held at its limit, a market order at the last close.
      order({ type: 'limit', limitPrice: '80', quantity: '50' }),
      order({ symbolId: KO, quantity: '20' }),
      // A sell frees nothing until it fills.
      order({ side: 'sell', quantity: '10' }),
    ];
    // 4001 and 1001 are set aside, leaving 3997.
    expect(check({ quantity: '39.96' }, { open }).refusal).toBeNull();
    const { refusal } = check({ quantity: '39.97' }, { open });
    expect(refusal?.code).toBe('insufficient_cash');
    expect(refusal?.message).toContain('3997.00 is free');
  });

  it('refuses a sell of more shares than are held and not already promised', () => {
    expect(check({ side: 'sell', quantity: '10' }).refusal).toBeNull();
    expect(check({ side: 'sell', quantity: '10.000001' }).refusal).toMatchObject({
      code: 'insufficient_shares',
    });
    const open = [order({ side: 'sell', type: 'limit', limitPrice: '120', quantity: '4' })];
    expect(check({ side: 'sell', quantity: '6' }, { open }).refusal).toBeNull();
    expect(check({ side: 'sell', quantity: '7' }, { open }).refusal?.code).toBe('insufficient_shares');
    // Another symbol's shares don't count.
    expect(check({ side: 'sell', symbolId: KO, quantity: '1' }).refusal?.code).toBe('insufficient_shares');
  });

  it('holds both sides to the limit per order, before commission', () => {
    const limited = { maxOrderNotional: '500' };
    expect(check({ quantity: '5' }, limited).refusal).toBeNull();
    expect(check({ quantity: '5.01' }, limited).refusal?.code).toBe('max_notional');
    expect(check({ side: 'sell', quantity: '6' }, limited).refusal?.code).toBe('max_notional');
  });

  it('passes a market order it cannot price: the fill checks it', () => {
    const { refusal, estimate: expected, cashAfter } = check(
      { quantity: '1000000' },
      { prices: new Map(), maxOrderNotional: '1' },
    );
    expect(refusal).toBeNull();
    expect(expected).toBeNull();
    expect(cashAfter).toBeNull();
  });
});
