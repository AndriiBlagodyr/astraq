// Market data on its way from a provider into the database. The provider
// client and mapper produce these rows and the repository stores them, so
// both sides import the shapes from here instead of from each other.

/** A closed range of session dates, `YYYY-MM-DD`. */
export type DateRange = { from: string; to: string };

/** A symbol as the bootstrap seeds it. */
export type SymbolSeed = { ticker: string; name: string; exchange: string };

/** One raw daily bar. Prices and volume are exact decimal strings. */
export type CandleRow = {
  ts: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

/** A split (both ratio sides) or a dividend (cash amount); `exDate` is YYYY-MM-DD. */
export type CorporateActionRow =
  | { type: 'SPLIT'; exDate: string; splitFrom: string; splitTo: string }
  | { type: 'DIVIDEND'; exDate: string; cashAmount: string };
