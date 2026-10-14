DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'RECRUITER', 'HR', 'WORKER');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "employees" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "full_name" TEXT,
    "image_id" TEXT,
    "level" TEXT,
    "position" TEXT,
    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_accounts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_key" "Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_accounts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_accounts_email_lowercase_check" CHECK ("email" = lower("email"))
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_accounts_employee_id_key" ON "user_accounts"("employee_id");
CREATE UNIQUE INDEX IF NOT EXISTS "user_accounts_email_key" ON "user_accounts"("email");
