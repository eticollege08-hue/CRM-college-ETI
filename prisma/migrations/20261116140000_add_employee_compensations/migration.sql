-- CreateTable
CREATE TABLE "employee_compensations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "salary" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employee_compensations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_compensations_employee_id_key" ON "employee_compensations"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_compensations_employee_id_company_id_key" ON "employee_compensations"("employee_id", "company_id");

-- CreateIndex
CREATE INDEX "employee_compensations_company_id_idx" ON "employee_compensations"("company_id");

-- AddForeignKey
ALTER TABLE "employee_compensations" ADD CONSTRAINT "employee_compensations_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employees"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_compensations" ADD CONSTRAINT "employee_compensations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
