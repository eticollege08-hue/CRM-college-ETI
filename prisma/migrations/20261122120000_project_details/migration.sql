ALTER TABLE "projects"
    ADD COLUMN "owner_id" TEXT,
    ADD COLUMN "budget" DECIMAL(12, 2),
    ADD COLUMN "deadline" DATE;

CREATE INDEX "projects_owner_id_idx" ON "projects"("owner_id");

ALTER TABLE "projects"
    ADD CONSTRAINT "projects_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "employees"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "project_links" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "project_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_links_project_id_sort_order_idx"
    ON "project_links"("project_id", "sort_order");

ALTER TABLE "project_links"
    ADD CONSTRAINT "project_links_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "project_members" (
    "project_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    CONSTRAINT "project_members_pkey" PRIMARY KEY ("project_id", "employee_id")
);

CREATE INDEX "project_members_employee_id_project_id_idx"
    ON "project_members"("employee_id", "project_id");

ALTER TABLE "project_members"
    ADD CONSTRAINT "project_members_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_members"
    ADD CONSTRAINT "project_members_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
