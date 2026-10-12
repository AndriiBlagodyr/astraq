-- Hand-edited after `prisma migrate dev --create-only`: the TimescaleDB
-- extension, the hypertable, and the CHECK constraint below are invisible to
-- the Prisma schema. Prisma doesn't introspect them, so they cause no drift.

-- The timescale/timescaledb image already creates the extension in its
-- default database; hosted Postgres and Prisma's shadow database don't.
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- CreateEnum
CREATE TYPE "corporate_action_type" AS ENUM ('split', 'dividend');

-- CreateTable
CREATE TABLE "symbols" (
    "id" SERIAL NOT NULL,
    "ticker" VARCHAR(16) NOT NULL,
    "name" TEXT NOT NULL,
    "exchange" VARCHAR(16) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "symbols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candles_daily" (
    "symbol_id" INTEGER NOT NULL,
    "ts" TIMESTAMPTZ(6) NOT NULL,
    "open" DECIMAL(18,6) NOT NULL,
    "high" DECIMAL(18,6) NOT NULL,
    "low" DECIMAL(18,6) NOT NULL,
    "close" DECIMAL(18,6) NOT NULL,
    "volume" BIGINT NOT NULL,

    CONSTRAINT "candles_daily_pkey" PRIMARY KEY ("symbol_id","ts")
);

-- Hand-written: turn candles_daily into a hypertable. One chunk per year
-- keeps chunk count low for daily bars. Timescale's default index on ts is
-- skipped: the (symbol_id, ts) primary key already serves every read we have,
-- and Prisma would see the extra index as drift and try to drop it.
SELECT create_hypertable(
    'candles_daily',
    by_range('ts', INTERVAL '1 year'),
    create_default_indexes => false
);

-- CreateTable
CREATE TABLE "corporate_actions" (
    "id" SERIAL NOT NULL,
    "symbol_id" INTEGER NOT NULL,
    "type" "corporate_action_type" NOT NULL,
    "ex_date" DATE NOT NULL,
    "split_from" DECIMAL(18,6),
    "split_to" DECIMAL(18,6),
    "cash_amount" DECIMAL(18,6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "symbols_ticker_key" ON "symbols"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_actions_symbol_id_type_ex_date_key" ON "corporate_actions"("symbol_id", "type", "ex_date");

-- AddForeignKey
ALTER TABLE "candles_daily" ADD CONSTRAINT "candles_daily_symbol_id_fkey" FOREIGN KEY ("symbol_id") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_actions" ADD CONSTRAINT "corporate_actions_symbol_id_fkey" FOREIGN KEY ("symbol_id") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written: a split sets both ratio sides, a dividend sets only the cash
-- amount. Prisma can't express a CHECK constraint.
ALTER TABLE "corporate_actions" ADD CONSTRAINT "corporate_actions_shape_check" CHECK (
    ("type" = 'split' AND "split_from" > 0 AND "split_to" > 0 AND "cash_amount" IS NULL)
    OR ("type" = 'dividend' AND "cash_amount" > 0 AND "split_from" IS NULL AND "split_to" IS NULL)
);
