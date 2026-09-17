-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('ACTUAL', 'WARMUP');

-- AlterEnum
ALTER TYPE "Difficulty" ADD VALUE 'MIXED';

-- AlterTable
ALTER TABLE "tests" ADD COLUMN     "difficulty" "Difficulty" NOT NULL DEFAULT 'MIXED',
ADD COLUMN     "is_free_tier" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "test_type" "TestType" NOT NULL DEFAULT 'WARMUP';

-- CreateTable
CREATE TABLE "class_subscriptions" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "class_level" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_subscriptions_student_id_idx" ON "class_subscriptions"("student_id");

-- CreateIndex
CREATE INDEX "class_subscriptions_end_date_idx" ON "class_subscriptions"("end_date");

-- CreateIndex
CREATE UNIQUE INDEX "class_subscriptions_student_id_class_level_key" ON "class_subscriptions"("student_id", "class_level");

-- CreateIndex
CREATE INDEX "questions_difficulty_idx" ON "questions"("difficulty");

-- CreateIndex
CREATE INDEX "tests_test_type_idx" ON "tests"("test_type");

-- CreateIndex
CREATE INDEX "tests_student_id_class_level_subject_test_type_idx" ON "tests"("student_id", "class_level", "subject", "test_type");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- AddForeignKey
ALTER TABLE "class_subscriptions" ADD CONSTRAINT "class_subscriptions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
