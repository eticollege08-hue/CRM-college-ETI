-- CreateTable
CREATE TABLE "hierarchy" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" TEXT NOT NULL,
    "subordinate_id" TEXT NOT NULL,

    CONSTRAINT "hierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hierarchy_employee_id_subordinate_id_key" ON "hierarchy"("employee_id", "subordinate_id");

-- AddForeignKey
ALTER TABLE "hierarchy" ADD CONSTRAINT "hierarchy_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hierarchy" ADD CONSTRAINT "hierarchy_subordinate_id_fkey" FOREIGN KEY ("subordinate_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
