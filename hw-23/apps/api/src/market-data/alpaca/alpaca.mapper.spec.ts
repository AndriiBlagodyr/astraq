import {
  sessionDate,
  toCandleRows,
  toCorporateActionRows,
} from './alpaca.mapper';
import { alpacaBarsPageSchema } from './alpaca.schemas';
import { parseJsonExact } from './exact-json';

describe('alpaca mapping', () => {
  it('keeps prices as the exact source text, never a float', () => {
    // As floats, 1205.170000 would lose its scale and 121.790000000000001
    // would collapse to 121.79.
    const page = alpacaBarsPageSchema.parse(
      parseJsonExact(
        '{"bars":{"NVDA":[{"t":"2024-06-10T04:00:00Z","o":1205.170000,' +
          '"h":121.94,"l":117.01,"c":121.790000000000001,"v":314162723,' +
          '"n":1,"vw":120.1}]},"next_page_token":null}',
      ),
    );

    expect(toCandleRows(page.bars.NVDA)).toEqual([
      {
        ts: new Date('2024-06-10T00:00:00.000Z'),
        open: '1205.170000',
        high: '121.94',
        low: '117.01',
        close: '121.790000000000001',
        volume: '314162723',
      },
    ]);
  });

  it('dates a bar by its New York session in and out of DST', () => {
    expect(sessionDate('2024-06-10T04:00:00Z')).toEqual(
      new Date('2024-06-10T00:00:00.000Z'),
    );
    expect(sessionDate('2024-01-10T05:00:00Z')).toEqual(
      new Date('2024-01-10T00:00:00.000Z'),
    );
  });

  it('maps forward and reverse splits, and sums dividends on one ex-date', () => {
    const rows = toCorporateActionRows({
      forward_splits: [
        {
          symbol: 'NVDA',
          old_rate: '1',
          new_rate: '10',
          ex_date: '2024-06-10',
        },
      ],
      reverse_splits: [
        { symbol: 'GE', old_rate: '8', new_rate: '1', ex_date: '2021-08-02' },
      ],
      cash_dividends: [
        { symbol: 'COST', rate: '1.13', ex_date: '2024-01-03' },
        { symbol: 'COST', rate: '15', ex_date: '2024-01-03' },
        { symbol: 'NVDA', rate: '0.01', ex_date: '2024-06-11' },
      ],
    });

    expect(rows.get('NVDA')).toEqual([
      { type: 'SPLIT', exDate: '2024-06-10', splitFrom: '1', splitTo: '10' },
      { type: 'DIVIDEND', exDate: '2024-06-11', cashAmount: '0.01' },
    ]);
    expect(rows.get('GE')).toEqual([
      { type: 'SPLIT', exDate: '2021-08-02', splitFrom: '8', splitTo: '1' },
    ]);
    expect(rows.get('COST')).toEqual([
      { type: 'DIVIDEND', exDate: '2024-01-03', cashAmount: '16.13' },
    ]);
  });

  it('rejects a price in exponent notation instead of storing it', () => {
    const result = alpacaBarsPageSchema.safeParse(
      parseJsonExact(
        '{"bars":{"X":[{"t":"2024-06-10T04:00:00Z","o":1e-7,"h":1,"l":1,' +
          '"c":1,"v":1}]},"next_page_token":null}',
      ),
    );

    expect(result.success).toBe(false);
  });
});
