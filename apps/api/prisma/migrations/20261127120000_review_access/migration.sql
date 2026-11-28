-- Hand-written to match `prisma migrate diff`; the CHECK constraints at the
-- end are invisible to the Prisma schema and cause no drift. ROADMAP "Review
-- access" side track, item 1: a sign-in an admin makes for a company, with
-- an end date and a switch.

-- AlterEnum
ALTER TYPE "session_revoked_reason" ADD VALUE 'access_closed';
ALTER TYPE "session_revoked_reason" ADD VALUE 'password_changed';

-- AlterEnum
ALTER TYPE "audit_action" ADD VALUE 'password_changed';
ALTER TYPE "audit_action" ADD VALUE 'password_reset';
ALTER TYPE "audit_action" ADD VALUE 'review_access_created';
ALTER TYPE "audit_action" ADD VALUE 'review_access_updated';
ALTER TYPE "audit_action" ADD VALUE 'review_access_revoked';
ALTER TYPE "audit_action" ADD VALUE 'review_access_refused';

-- CreateTable
CREATE TABLE "review_access" (
    "user_id" UUID NOT NULL,
    "company" VARCHAR(120) NOT NULL,
    "note" VARCHAR(500),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "shared_credentials" BOOLEAN NOT NULL,
    "must_change_password" BOOLEAN NOT NULL,
    "password_changed_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_access_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "review_access" ADD CONSTRAINT "review_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_access" ADD CONSTRAINT "review_access_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A shared password can't be changed, so it can't be required to change.
ALTER TABLE "review_access" ADD CONSTRAINT "review_access_password_policy_check"
  CHECK (NOT (shared_credentials AND must_change_password));

-- Trimmed, one line, never empty; a note is NULL when there is none.
ALTER TABLE "review_access" ADD CONSTRAINT "review_access_company_check"
  CHECK (company = btrim(company) AND company <> '' AND company !~ E'[\r\n\t]');
ALTER TABLE "review_access" ADD CONSTRAINT "review_access_note_check"
  CHECK (note IS NULL OR (note = btrim(note) AND note <> ''));
