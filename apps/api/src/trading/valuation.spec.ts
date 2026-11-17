import { decimal, format } from '../common/decimal';
import { valuePortfolio, type Holding } from './valuation';

const holding = (quantity: string, cost: string, price: string | null): Holding => ({
  quantity: decimal(quantity),
  cost: decimal(cost),
  price: price === null ? null : decimal(price),
});

describe('valuePortfolio', () => {
  it('prices each holding in cents and adds cash and dividends owed', () => {
    const value = valuePortfolio(decimal('250.00'), decimal('10.00'), [
      holding('10', '1000.00', '120.5'),
      // 3.333333 × 9.99 = 33.29999667: a third of a cent short of 33.30.
      holding('3.333333', '40.00', '9.99'),
    ]);

    expect(value.holdings.map((h) => format(h.marketValue!))).toEqual(['1205.00', '33.30']);
    expect(value.holdings.map((h) => format(h.unrealizedPnl!))).toEqual(['205.00', '-6.70']);
    expect(format(value.marketValue!)).toBe('1238.30');
    expect(format(value.unrealizedPnl!)).toBe('198.30');
    expect(format(value.equity!)).toBe('1498.30');
  });

  it('is cash and dividends owed when nothing is held', () => {
    const value = valuePortfolio(decimal('500.00'), decimal('0.00'), []);
    expect(format(value.marketValue!)).toBe('0.00');
    expect(format(value.equity!)).toBe('500.00');
  });

  it('gives no total when a holding has no price', () => {
    const value = valuePortfolio(decimal('500.00'), decimal('0.00'), [
      holding('10', '1000.00', '120'),
      holding('5', '50.00', null),
    ]);
    expect(format(value.holdings[0]!.marketValue!)).toBe('1200.00');
    expect(value.holdings[1]).toEqual({ marketValue: null, unrealizedPnl: null });
    expect(value.marketValue).toBeNull();
    expect(value.equity).toBeNull();
  });
});
