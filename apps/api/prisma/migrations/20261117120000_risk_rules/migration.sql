-- Hand-written to match `prisma migrate diff`; the CHECK constraints at the
-- end are invisible to the Prisma schema and cause no drift. Phase 3 item 5
-- (ROADMAP.md): the exchange calendar and a portfolio's order size limit.

-- AlterTable
ALTER TABLE "portfolios" ADD COLUMN     "max_order_notional" DECIMAL(18,2);

-- CreateTable
CREATE TABLE "market_sessions" (
    "date" DATE NOT NULL,
    "opens_at" TIMESTAMPTZ(6) NOT NULL,
    "closes_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "market_sessions_pkey" PRIMARY KEY ("date")
);

-- A limit of zero would refuse every order; "no limit" is NULL.
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_max_order_notional_check"
  CHECK (max_order_notional IS NULL OR max_order_notional > 0);

ALTER TABLE "market_sessions" ADD CONSTRAINT "market_sessions_hours_check"
  CHECK (closes_at > opens_at);
