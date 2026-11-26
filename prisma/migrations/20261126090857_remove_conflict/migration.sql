/*
  Warnings:

  - You are about to drop the column `email` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `projects` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `salary` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `budget` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `deadline` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `owner_id` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the `project_links` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_members` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "project_links" DROP CONSTRAINT "project_links_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_members" DROP CONSTRAINT "project_members_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "project_members" DROP CONSTRAINT "project_members_project_id_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_owner_id_fkey";

-- DropIndex
DROP INDEX "employees_email_key";

-- DropIndex
DROP INDEX "projects_owner_id_idx";

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "email",
DROP COLUMN "projects",
DROP COLUMN "salary";

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "budget",
DROP COLUMN "deadline",
DROP COLUMN "owner_id";

-- DropTable
DROP TABLE "project_links";

-- DropTable
DROP TABLE "project_members";
