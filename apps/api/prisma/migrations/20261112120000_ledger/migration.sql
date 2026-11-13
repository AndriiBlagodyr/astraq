-- Generated with `prisma migrate diff`, then hand-edited: the CHECK
-- constraints, functions, and triggers at the end are invisible to the
-- Prisma schema and cause no drift. Phase 3 item 2 (ROADMAP.md): paper
-- portfolios and their double-entry ledger (ADR 0009).
-- CreateEnum
CREATE TYPE "ledger_transaction_kind" AS ENUM ('deposit', 'withdrawal', 'buy', 'sell');

-- CreateEnum
CREATE TYPE "ledger_account" AS ENUM ('cash', 'securities', 'capital', 'fees', 'realized_pnl');

-- CreateTable
CREATE TABLE "portfolios" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "slippage_bps" INTEGER NOT NULL DEFAULT 0,
    "commission_per_order" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "commission_per_share" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_transactions" (
    "id" UUID NOT NULL,
    "portfolio_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "kind" "ledger_transaction_kind" NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" BIGSERIAL NOT NULL,
    "transaction_id" UUID NOT NULL,
    "account" "ledger_account" NOT NULL,
    "symbol_id" INTEGER,
    "amount" DECIMAL(20,2) NOT NULL,
    "quantity" DECIMAL(24,6) NOT NULL DEFAULT 0,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_user_id_name_key" ON "portfolios"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_transactions_portfolio_id_seq_key" ON "ledger_transactions"("portfolio_id", "seq");

-- CreateIndex
CREATE INDEX "ledger_entries_transaction_id_idx" ON "ledger_entries"("transaction_id");

-- CreateIndex
CREATE INDEX "ledger_entries_symbol_id_idx" ON "ledger_entries"("symbol_id");

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_symbol_id_fkey" FOREIGN KEY ("symbol_id") REFERENCES "symbols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A name is trimmed and one line, like a watchlist's.
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_name_check"
  CHECK (name = btrim(name) AND name <> '' AND name !~ E'[\r\n\t]');

-- The fill model's cost settings (ADR 0008): never negative, slippage at most 10%.
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_costs_check"
  CHECK (slippage_bps BETWEEN 0 AND 1000 AND commission_per_order >= 0 AND commission_per_share >= 0);

ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_seq_check" CHECK (seq >= 1);

-- Securities and realized PnL belong to a symbol; cash, capital, and fees don't.
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_symbol_check"
  CHECK ((account IN ('securities', 'realized_pnl')) = (symbol_id IS NOT NULL));

-- Only the securities account counts shares, and no entry is empty.
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_quantity_check"
  CHECK ((quantity = 0 OR account = 'securities') AND (amount <> 0 OR quantity <> 0));

-- The ledger is append-only. An UPDATE is always refused. A DELETE is
-- refused when a statement asks for it directly (trigger depth 1) and
-- allowed when it is the foreign key's cascade from a deleted portfolio
-- (depth 2): history goes only together with its portfolio.
CREATE FUNCTION ledger_reject_change() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'The ledger is append-only: % on % is not allowed', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_transactions_append_only
  BEFORE UPDATE OR DELETE ON "ledger_transactions"
  FOR EACH ROW EXECUTE FUNCTION ledger_reject_change();

CREATE TRIGGER ledger_entries_append_only
  BEFORE UPDATE OR DELETE ON "ledger_entries"
  FOR EACH ROW EXECUTE FUNCTION ledger_reject_change();

CREATE TRIGGER ledger_transactions_no_truncate
  BEFORE TRUNCATE ON "ledger_transactions"
  FOR EACH STATEMENT EXECUTE FUNCTION ledger_reject_change();

CREATE TRIGGER ledger_entries_no_truncate
  BEFORE TRUNCATE ON "ledger_entries"
  FOR EACH STATEMENT EXECUTE FUNCTION ledger_reject_change();

-- Double entry: a transaction's entries sum to zero. Checked at commit
-- (deferred), once the transaction has all of its entries.
CREATE FUNCTION ledger_transaction_balanced() RETURNS trigger AS $$
DECLARE
  total numeric;
BEGIN
  SELECT sum(amount) INTO total FROM ledger_entries WHERE transaction_id = NEW.transaction_id;
  IF total <> 0 THEN
    RAISE EXCEPTION 'Ledger transaction % is unbalanced by %', NEW.transaction_id, total
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER ledger_entries_balanced
  AFTER INSERT ON "ledger_entries"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION ledger_transaction_balanced();
