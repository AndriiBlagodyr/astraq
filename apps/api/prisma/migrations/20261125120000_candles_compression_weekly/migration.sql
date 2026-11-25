-- Hand-written (ROADMAP.md, Phase 4 item 5). All of it is TimescaleDB DDL
-- that the Prisma schema can't express and Prisma doesn't introspect, so it
-- causes no drift. Both features need the Timescale License build, which
-- the `timescale/timescaledb` image is (ADR 0005).
--
-- Prisma sends a migration as one multi-statement query, which Postgres
-- runs as one transaction. Everything here is allowed inside one; the one
-- thing that isn't, filling the aggregate, is left to its policy below.

-- 1. Compression.
--
-- A compressed chunk stores each column of up to 1,000 rows as one array,
-- encoded by type (delta-of-delta for timestamps, Gorilla for floats,
-- dictionary or LZ for the rest), instead of one heap tuple per bar.
--
-- `segmentby = symbol_id`: rows are grouped by symbol before they are
-- packed, and the symbol stays a plain, indexed column on the compressed
-- chunk. Every read we have starts with `WHERE symbol_id = ...`, so it
-- finds one symbol's batches by index and unpacks only those.
-- `orderby = ts DESC`: inside a symbol, batches are cut along time, and each
-- keeps its min and max ts, so "the last bar before this date" skips the
-- batches that can't hold it.
--
-- The primary key (symbol_id, ts) is covered by the two settings, which is
-- what lets `INSERT ... ON CONFLICT` keep working on a compressed chunk: a
-- backfill or a corrected bar unpacks the one symbol's batches it touches,
-- and the next policy run packs them again.
ALTER TABLE "candles_daily" SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'symbol_id',
    timescaledb.compress_orderby = 'ts DESC'
);

-- A chunk holds a year (see the init migration) and is compressed once the
-- whole of it is 90 days old. The chunk the daily refresh writes into is
-- therefore never compressed, and a symbol that fell a quarter behind still
-- catches up on plain rows.
--
-- The first run waits 15 minutes: started together with the aggregate's
-- first refresh below, it loses the race for the chunk locks and is
-- recorded as a failed run before it retries.
SELECT add_compression_policy(
    'candles_daily',
    compress_after => INTERVAL '90 days',
    schedule_interval => INTERVAL '1 day',
    initial_start => now() + INTERVAL '15 minutes'
);

-- No retention policy, on purpose. A retention policy drops whole chunks
-- older than an interval, and here every chunk is the product: the only
-- copy of a symbol's history, which the adjustment query reads all the way
-- back. Compressed, a year of daily bars for the whole watched set is a few
-- megabytes. Retention arrives with the 1-minute bars (Phase 9), where the
-- raw rows age out and the aggregates over them stay.

-- 2. Weekly bars, as a continuous aggregate.
--
-- A materialized view Timescale keeps current by itself: it remembers
-- which time ranges of `candles_daily` changed (an invalidation log filled
-- by a trigger) and a refresh recomputes only the buckets in those ranges.
--
-- `time_bucket('1 week', ts)` cuts at Monday 00:00 UTC. `first(open, ts)`
-- and `last(close, ts)` are Timescale's "value at the smallest / largest
-- ts" aggregates. `first_ts` and `last_ts` are the week's first and last
-- session: the reader labels the bar with the first, and needs both to
-- tell whether a corporate action went ex inside the week (see
-- `findWeekly` in src/symbols/candles.repository.ts).
--
-- The prices are raw, like the bars they are built from: adjustment stays a
-- query-time step.
--
-- `materialized_only = false` is real-time aggregation: buckets newer than
-- what has been materialized are computed from `candles_daily` on read, so
-- the current week is never missing. It does not cover a change to an older
-- week: that one is stale until a refresh, which is why ingestion refreshes
-- the range it wrote (`MarketDataRepository.refreshWeeklyBars`) and the
-- policy below is only the safety net.
--
-- WITH NO DATA: filling the view at creation can't run inside a
-- transaction. The policy's first run, seconds after this commits, does it.
CREATE MATERIALIZED VIEW "candles_weekly"
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT symbol_id,
       time_bucket(INTERVAL '1 week', ts) AS bucket,
       first(open, ts) AS open,
       max(high) AS high,
       min(low) AS low,
       last(close, ts) AS close,
       sum(volume) AS volume,
       min(ts) AS first_ts,
       max(ts) AS last_ts
FROM "candles_daily"
GROUP BY symbol_id, bucket
WITH NO DATA;

-- Every hour, refresh whatever changed anywhere in the history
-- (`start_offset => NULL`; a backfill writes twenty years back) up to a
-- week ago. The newest buckets are left to real-time aggregation and to the
-- refresh ingestion asks for, so the policy doesn't rebuild the current
-- week every hour for nothing.
SELECT add_continuous_aggregate_policy(
    'candles_weekly',
    start_offset => NULL,
    end_offset => INTERVAL '1 week',
    schedule_interval => INTERVAL '1 hour'
);
