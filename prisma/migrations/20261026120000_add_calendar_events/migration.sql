CREATE TYPE "EventType" AS ENUM ('LEAVE', 'SICK_LEAVE', 'VACATION', 'TIME_OFF', 'MEETING');

CREATE TABLE "events" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "owner_account_id" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(4000) NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "time_zone" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "events_positive_range" CHECK ("starts_at" < "ends_at")
);

CREATE TABLE "event_participants" (
    "event_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("event_id", "employee_id")
);

CREATE INDEX "events_starts_at_ends_at_idx" ON "events"("starts_at", "ends_at");
CREATE INDEX "events_owner_account_id_idx" ON "events"("owner_account_id");
CREATE INDEX "event_participants_employee_id_event_id_idx" ON "event_participants"("employee_id", "event_id");
ALTER TABLE "events" ADD CONSTRAINT "events_owner_account_id_fkey" FOREIGN KEY ("owner_account_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
