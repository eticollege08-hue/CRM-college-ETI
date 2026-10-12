-- Prisma не підтримує down-міграції; цей файл НЕ виконується автоматично.
-- Запуск: docker compose -f docker-compose.dev.yaml exec -T db psql -U $DATABASE_USER -d $DATABASE_DB < down.sql
-- Після цього видаліть запис з _prisma_migrations або зробіть `prisma migrate resolve --rolled-back <name>`.
DROP TABLE IF EXISTS "tickets";
DROP TABLE IF EXISTS "employee_experiences";
DROP TABLE IF EXISTS "employee_compensations";
DROP TABLE IF EXISTS "user_accounts";
DROP TABLE IF EXISTS "employees";
DROP TYPE IF EXISTS "ticket_status";
DROP TYPE IF EXISTS "employee_status";