/*
  Warnings:

  - Added the required column `plan_id` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "plan_id" INTEGER NOT NULL;
