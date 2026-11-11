-- Generated with `prisma migrate diff`, then hand-edited: the CHECK
-- constraint is invisible to the Prisma schema and causes no drift.
-- Phase 2 item 9 (ROADMAP.md): a display name for the Settings profile
-- and the user menu.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "name" VARCHAR(80);

-- A name is trimmed, one line, and never empty (null means "not set").
ALTER TABLE "users" ADD CONSTRAINT "users_name_check"
  CHECK (name IS NULL OR (name = btrim(name) AND name <> '' AND name !~ E'[\r\n\t]'));
