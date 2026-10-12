-- CRM-102: domain foundation (Employee / UserAccount / card entities)
-- Ідемпотентна: повторний запуск не падає (IF NOT EXISTS / DO-блоки).

DO $$ BEGIN
  CREATE TYPE "employee_status" AS ENUM ('hired', 'active', 'on_leave', 'fired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ticket_status" AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "employees" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "full_name" VARCHAR(255) NOT NULL,
  "image_id" UUID,
  "level" VARCHAR(50),
  "position" VARCHAR(150),
  "contacts" JSONB NOT NULL DEFAULT '{}',
  "experience_start_date" DATE,
  "status" "employee_status" NOT NULL DEFAULT 'hired',
  "hired_at" DATE,
  "manager_id" UUID,
  "leave_balance_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employees_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "employees_no_self_manager_chk" CHECK ("manager_id" IS NULL OR "manager_id" <> "id"),
  CONSTRAINT "employees_leave_balance_chk" CHECK ("leave_balance_days" >= 0)
);
CREATE INDEX IF NOT EXISTS "employees_manager_id_idx" ON "employees"("manager_id");
CREATE INDEX IF NOT EXISTS "employees_status_idx" ON "employees"("status");
CREATE INDEX IF NOT EXISTS "employees_full_name_idx" ON "employees"("full_name");

CREATE TABLE IF NOT EXISTS "user_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "role_key" VARCHAR(64) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_accounts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "user_accounts_email_lowercase_chk" CHECK ("email" = lower("email"))
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_accounts_employee_id_key" ON "user_accounts"("employee_id");
CREATE UNIQUE INDEX IF NOT EXISTS "user_accounts_email_key" ON "user_accounts"("email");
CREATE INDEX IF NOT EXISTS "user_accounts_role_key_idx" ON "user_accounts"("role_key");

CREATE TABLE IF NOT EXISTS "employee_compensations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "salary" DECIMAL(12,2) NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'UAH',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employee_compensations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_compensations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_compensations_salary_chk" CHECK ("salary" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "employee_compensations_employee_id_key" ON "employee_compensations"("employee_id");

CREATE TABLE IF NOT EXISTS "employee_experiences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "company" VARCHAR(255) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_experiences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_experiences_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_experiences_dates_chk" CHECK ("end_date" IS NULL OR "end_date" >= "start_date")
);
CREATE INDEX IF NOT EXISTS "employee_experiences_employee_id_idx" ON "employee_experiences"("employee_id");

CREATE TABLE IF NOT EXISTS "tickets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" "ticket_status" NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tickets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tickets_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "tickets_employee_id_status_idx" ON "tickets"("employee_id", "status");