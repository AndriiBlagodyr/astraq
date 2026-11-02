-- Generated with `prisma migrate diff`, then hand-edited: the CHECK
-- constraints at the end are invisible to the Prisma schema and cause no
-- drift. Phase 2 item 5 (ROADMAP.md): a user's named groups of symbols.

-- CreateTable
CREATE TABLE "watchlists" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_items" (
    "watchlist_id" UUID NOT NULL,
    "symbol_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("watchlist_id","symbol_id")
);

-- CreateIndex
CREATE INDEX "watchlists_user_id_position_idx" ON "watchlists"("user_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "watchlists_user_id_name_key" ON "watchlists"("user_id", "name");

-- CreateIndex
CREATE INDEX "watchlist_items_watchlist_id_position_idx" ON "watchlist_items"("watchlist_id", "position");

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_watchlist_id_fkey" FOREIGN KEY ("watchlist_id") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_symbol_id_fkey" FOREIGN KEY ("symbol_id") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A name is trimmed and one line: the api does it too, this catches other writers.
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_name_check"
  CHECK (name = btrim(name) AND name <> '' AND name !~ E'[\r\n\t]');

-- Positions are 0-based.
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_position_check" CHECK (position >= 0);
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_position_check" CHECK (position >= 0);
