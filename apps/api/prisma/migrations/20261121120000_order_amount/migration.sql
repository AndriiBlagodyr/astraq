-- Hand-written to match `prisma migrate diff`; the CHECK constraint at the
-- end is invisible to the Prisma schema and causes no drift. An order can be
-- asked for in dollars: the api sizes it in shares when it is placed and
-- keeps the amount it was sized from (ROADMAP.md, Phase 3 item 6).

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "amount" DECIMAL(18,2);

-- "Placed in shares" is NULL, never zero.
ALTER TABLE "orders" ADD CONSTRAINT "orders_amount_check"
  CHECK (amount IS NULL OR amount > 0);
