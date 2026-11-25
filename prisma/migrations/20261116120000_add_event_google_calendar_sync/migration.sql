ALTER TABLE "events" ADD COLUMN "google_event_id" VARCHAR(1024);

CREATE UNIQUE INDEX "events_google_event_id_key" ON "events"("google_event_id");
