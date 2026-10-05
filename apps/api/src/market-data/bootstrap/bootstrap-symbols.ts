import type { SymbolSeed } from '../market-data.repository';

/**
 * The fixed Phase 1 universe. Picked to exercise adjustment, not to be a
 * portfolio: several forward splits (NVDA 2021 4:1 and 2024 10:1, AAPL 2020,
 * TSLA 2020 and 2022, AMZN and GOOGL 2022, AVGO, CMG and WMT 2024, NFLX 2025),
 * steady dividend payers, and two ETFs. Names and exchanges (MIC codes) live
 * here rather than coming from a third endpoint.
 */
export const BOOTSTRAP_SYMBOLS: SymbolSeed[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'XNAS' },
  { ticker: 'AMD', name: 'Advanced Micro Devices, Inc.', exchange: 'XNAS' },
  { ticker: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'XNAS' },
  { ticker: 'AVGO', name: 'Broadcom Inc.', exchange: 'XNAS' },
  { ticker: 'CMG', name: 'Chipotle Mexican Grill, Inc.', exchange: 'XNYS' },
  { ticker: 'COST', name: 'Costco Wholesale Corporation', exchange: 'XNAS' },
  { ticker: 'GOOGL', name: 'Alphabet Inc. Class A', exchange: 'XNAS' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', exchange: 'XNYS' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'XNYS' },
  { ticker: 'KO', name: 'The Coca-Cola Company', exchange: 'XNYS' },
  { ticker: 'META', name: 'Meta Platforms, Inc.', exchange: 'XNAS' },
  { ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'XNAS' },
  { ticker: 'NFLX', name: 'Netflix, Inc.', exchange: 'XNAS' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'XNAS' },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust, Series 1', exchange: 'XNAS' },
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'ARCX' },
  { ticker: 'TSLA', name: 'Tesla, Inc.', exchange: 'XNAS' },
  { ticker: 'V', name: 'Visa Inc.', exchange: 'XNYS' },
  { ticker: 'WMT', name: 'Walmart Inc.', exchange: 'XNAS' },
  { ticker: 'XOM', name: 'Exxon Mobil Corporation', exchange: 'XNYS' },
];

/** First session requested. Alpaca's historical SIP data starts in 2016. */
export const BOOTSTRAP_FROM = '2016-01-01';
