-- Generated with `prisma migrate diff`, then hand-edited: the CHECK
-- constraints at the end are invisible to the Prisma schema and cause no
-- drift. Phase 3 items 3 and 4 (ROADMAP.md): orders and their fills, and
-- what the ledger needs to book splits and dividends (ADR 0009).
-- CreateEnum
CREATE TYPE "order_side" AS ENUM ('buy', 'sell');

-- CreateEnum
CREATE TYPE "order_type" AS ENUM ('market', 'limit');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('open', 'filled', 'cancelled', 'rejected');

-- CreateEnum
CREATE TYPE "order_close_reason" AS ENUM ('user', 'split', 'insufficient_cash', 'insufficient_shares', 'too_small');

-- CreateEnum
CREATE TYPE "fill_rule" AS ENUM ('market_open', 'market_last', 'limit_open', 'limit_cross');

-- AlterEnum

ALTER TYPE "ledger_account" ADD VALUE 'dividends_receivable';
ALTER TYPE "ledger_account" ADD VALUE 'dividend_income';

-- AlterEnum

ALTER TYPE "ledger_transaction_kind" ADD VALUE 'split';
ALTER TYPE "ledger_transaction_kind" ADD VALUE 'dividend';
ALTER TYPE "ledger_transaction_kind" ADD VALUE 'dividend_payment';

-- AlterTable
ALTER TABLE "corporate_actions" ADD COLUMN     "pay_date" DATE;

-- AlterTable
ALTER TABLE "ledger_transactions" ADD COLUMN     "split_from" DECIMAL(18,6),
ADD COLUMN     "split_to" DECIMAL(18,6);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "portfolio_id" UUID NOT NULL,
    "symbol_id" INTEGER NOT NULL,
    "side" "order_side" NOT NULL,
    "type" "order_type" NOT NULL,
    "quantity" DECIMAL(24,6) NOT NULL,
    "limit_price" DECIMAL(18,6),
    "status" "order_status" NOT NULL DEFAULT 'open',
    "close_reason" "order_close_reason",
    "idempotency_key" VARCHAR(128) NOT NULL,
    "placed_at" TIMESTAMPTZ(6) NOT NULL,
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fills" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "ledger_transaction_id" UUID NOT NULL,
    "rule" "fill_rule" NOT NULL,
    "price" DECIMAL(18,6) NOT NULL,
    "quantity" DECIMAL(24,6) NOT NULL,
    "notional" DECIMAL(20,2) NOT NULL,
    "commission" DECIMAL(20,2) NOT NULL,
    "session_date" DATE NOT NULL,
    "filled_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orders_portfolio_id_placed_at_idx" ON "orders"("portfolio_id", "placed_at" DESC);

-- CreateIndex
CREATE INDEX "orders_portfolio_id_status_idx" ON "orders"("portfolio_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "orders_portfolio_id_idempotency_key_key" ON "orders"("portfolio_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "fills_order_id_key" ON "fills"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "fills_ledger_transaction_id_key" ON "fills"("ledger_transaction_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_symbol_id_fkey" FOREIGN KEY ("symbol_id") REFERENCES "symbols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fills" ADD CONSTRAINT "fills_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fills" ADD CONSTRAINT "fills_ledger_transaction_id_fkey" FOREIGN KEY ("ledger_transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- An order is for a positive number of shares; a limit order has a positive
-- limit and a market order has none.
ALTER TABLE "orders" ADD CONSTRAINT "orders_quantity_check" CHECK (quantity > 0);

ALTER TABLE "orders" ADD CONSTRAINT "orders_limit_price_check"
  CHECK ((type = 'limit') = (limit_price IS NOT NULL) AND (limit_price IS NULL OR limit_price > 0));

-- An open order has no end; a cancelled or rejected one says why, and a
-- filled one doesn't.
ALTER TABLE "orders" ADD CONSTRAINT "orders_closed_check"
  CHECK ((status = 'open') = (closed_at IS NULL)
     AND (status IN ('cancelled', 'rejected')) = (close_reason IS NOT NULL));

-- The key is what the client sent: printable ASCII, not blank.
ALTER TABLE "orders" ADD CONSTRAINT "orders_idempotency_key_check"
  CHECK (idempotency_key ~ '^[\x21-\x7e]{1,128}$');

ALTER TABLE "fills" ADD CONSTRAINT "fills_amounts_check"
  CHECK (price > 0 AND quantity > 0 AND notional > 0 AND commission >= 0);

-- The two dividend accounts belong to a symbol, like securities and
-- realized PnL. The comparison is on the enum's text: a value added by
-- ALTER TYPE can't be used as an enum until this migration commits.
ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_entries_symbol_check";
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_symbol_check"
  CHECK ((account::text IN ('securities', 'realized_pnl', 'dividends_receivable', 'dividend_income'))
         = (symbol_id IS NOT NULL));

-- A split carries its ratio, and nothing else does.
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_split_check"
  CHECK ((kind::text = 'split') = (split_from IS NOT NULL)
     AND (split_from IS NULL) = (split_to IS NULL)
     AND (split_from IS NULL OR (split_from > 0 AND split_to > 0)));

-- Only a dividend has a pay date.
ALTER TABLE "corporate_actions" ADD CONSTRAINT "corporate_actions_pay_date_check"
  CHECK (pay_date IS NULL OR type = 'dividend');
