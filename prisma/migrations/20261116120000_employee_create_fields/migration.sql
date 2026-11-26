ALTER TABLE "employees"
    ADD COLUMN "email" TEXT,
    ADD COLUMN "experience" INTEGER,
    ADD COLUMN "salary" DECIMAL(12, 2),
    ADD COLUMN "projects" TEXT;

CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");