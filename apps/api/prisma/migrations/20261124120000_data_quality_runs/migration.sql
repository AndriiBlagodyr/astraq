-- Matches `prisma migrate diff`. One row per data quality check of the
-- stored bars (ROADMAP.md, Phase 4 item 4): how many problems each check
-- found, and a capped sample of them as JSON. `missing_sessions` is NULL
-- when that check couldn't run because no exchange calendar is stored.

-- CreateTable
CREATE TABLE "data_quality_runs" (
    "id" SERIAL NOT NULL,
    "session" DATE NOT NULL,
    "checked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "symbols" INTEGER NOT NULL,
    "missing_sessions" INTEGER,
    "duplicate_bars" INTEGER NOT NULL,
    "ohlc_violations" INTEGER NOT NULL,
    "stale_symbols" INTEGER NOT NULL,
    "issues" JSONB NOT NULL,

    CONSTRAINT "data_quality_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_quality_runs_checked_at_idx" ON "data_quality_runs"("checked_at");
