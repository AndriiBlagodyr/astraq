import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  fillAtLastPrice,
  fillOnBar,
  type Fill,
  type FillBar,
  type FillCosts,
  type FillOrder,
} from './fill-model';

// The shared fixtures are the fill model's contract (ADR 0008): the Python
// backtester runs the same file in Phase 5.
interface FixtureCase {
  name: string;
  order: FillOrder;
  bar?: FillBar;
  lastPrice?: string;
  costs: string;
  expected: Fill | null;
}

const fixtures = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../../packages/shared/fixtures/fill-model.json'),
    'utf8',
  ),
) as { costs: Record<string, FillCosts>; cases: FixtureCase[] };

describe('fill model (shared fixtures)', () => {
  it.each(fixtures.cases)('$name', (fixture) => {
    const costs = fixtures.costs[fixture.costs]!;
    const result = fixture.bar
      ? fillOnBar(fixture.order, fixture.bar, costs)
      : fillAtLastPrice(fixture.order, fixture.lastPrice!, costs);
    expect(result).toEqual(fixture.expected);
  });
});

describe('fill model (input guards)', () => {
  const bar = { open: '10', high: '11', low: '9', close: '10' };
  const free = fixtures.costs.free!;

  it('rejects a quantity of zero and a limit order without a price', () => {
    const order = { side: 'buy', type: 'market', limitPrice: null } as const;
    expect(() => fillOnBar({ ...order, quantity: '0' }, bar, free)).toThrow(
      RangeError,
    );
    expect(() =>
      fillOnBar({ ...order, type: 'limit', quantity: '1' }, bar, free),
    ).toThrow(RangeError);
  });
});
