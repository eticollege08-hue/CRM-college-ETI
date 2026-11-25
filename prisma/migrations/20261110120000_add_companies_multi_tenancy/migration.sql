-- Rows that predate tenancy move into one "Default company",
-- which is created only when the database already holds data.

-- DropForeignKey
ALTER TABLE "user_accounts" DROP CONSTRAINT "user_accounts_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "hierarchy" DROP CONSTRAINT "hierarchy_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "hierarchy" DROP CONSTRAINT "hierarchy_subordinate_id_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_owner_account_id_fkey";

-- DropForeignKey
ALTER TABLE "event_participants" DROP CONSTRAINT "event_participants_event_id_fkey";

-- DropForeignKey
ALTER TABLE "event_participants" DROP CONSTRAINT "event_participants_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "estimates" DROP CONSTRAINT "estimates_created_by_fkey";

-- DropIndex
DROP INDEX "events_starts_at_ends_at_idx";

-- DropIndex
DROP INDEX "estimates_deleted_at_idx";

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- Backfill
INSERT INTO "companies" ("name", "updated_at")
SELECT 'Default company', CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "employees")
   OR EXISTS (SELECT 1 FROM "user_accounts")
   OR EXISTS (SELECT 1 FROM "hierarchy")
   OR EXISTS (SELECT 1 FROM "about_us")
   OR EXISTS (SELECT 1 FROM "events")
   OR EXISTS (SELECT 1 FROM "projects")
   OR EXISTS (SELECT 1 FROM "estimates");

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "company_id" TEXT;
ALTER TABLE "user_accounts" ADD COLUMN "company_id" TEXT;
ALTER TABLE "hierarchy" ADD COLUMN "company_id" TEXT;
ALTER TABLE "about_us" ADD COLUMN "company_id" TEXT;
ALTER TABLE "events" ADD COLUMN "company_id" TEXT;
ALTER TABLE "event_participants" ADD COLUMN "company_id" TEXT;
ALTER TABLE "projects" ADD COLUMN "company_id" TEXT;
ALTER TABLE "estimates" ADD COLUMN "company_id" TEXT;

UPDATE "employees" SET "company_id" = (SELECT "id" FROM "companies" WHERE "name" = 'Default company');
UPDATE "user_accounts" SET "company_id" = (SELECT "id" FROM "companies" WHERE "name" = 'Default company');
UPDATE "hierarchy" SET "company_id" = (SELECT "id" FROM "companies" WHERE "name" = 'Default company');
UPDATE "about_us" SET "company_id" = (SELECT "id" FROM "companies" WHERE "name" = 'Default company');
UPDATE "events" SET "company_id" = (SELECT "id" FROM "companies" WHERE "name" = 'Default company');
UPDATE "event_participants" SET "company_id" = (SELECT "id" FROM "companies" WHERE "name" = 'Default company');
UPDATE "projects" SET "company_id" = (SELECT "id" FROM "companies" WHERE "name" = 'Default company');
UPDATE "estimates" SET "company_id" = (SELECT "id" FROM "companies" WHERE "name" = 'Default company');

ALTER TABLE "employees" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "user_accounts" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "hierarchy" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "about_us" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "events" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "event_participants" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "estimates" ALTER COLUMN "company_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE INDEX "employees_company_id_idx" ON "employees"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_id_company_id_key" ON "employees"("id", "company_id");

-- CreateIndex
CREATE INDEX "user_accounts_company_id_idx" ON "user_accounts"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_id_company_id_key" ON "user_accounts"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_employee_id_company_id_key" ON "user_accounts"("employee_id", "company_id");

-- CreateIndex
CREATE INDEX "hierarchy_company_id_idx" ON "hierarchy"("company_id");

-- CreateIndex
CREATE INDEX "about_us_company_id_idx" ON "about_us"("company_id");

-- CreateIndex
CREATE INDEX "events_company_id_starts_at_ends_at_idx" ON "events"("company_id", "starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "events_id_company_id_key" ON "events"("id", "company_id");

-- CreateIndex
CREATE INDEX "projects_company_id_idx" ON "projects"("company_id");

-- CreateIndex
CREATE INDEX "estimates_company_id_deleted_at_idx" ON "estimates"("company_id", "deleted_at");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employees"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hierarchy" ADD CONSTRAINT "hierarchy_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employees"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hierarchy" ADD CONSTRAINT "hierarchy_subordinate_id_company_id_fkey" FOREIGN KEY ("subordinate_id", "company_id") REFERENCES "employees"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hierarchy" ADD CONSTRAINT "hierarchy_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "about_us" ADD CONSTRAINT "about_us_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_owner_account_id_company_id_fkey" FOREIGN KEY ("owner_account_id", "company_id") REFERENCES "user_accounts"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_company_id_fkey" FOREIGN KEY ("event_id", "company_id") REFERENCES "events"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employees"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_created_by_company_id_fkey" FOREIGN KEY ("created_by", "company_id") REFERENCES "user_accounts"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;
