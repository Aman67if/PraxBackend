-- CreateEnum
CREATE TYPE "TestGroupType" AS ENUM ('EXAM', 'PRE_EXAM', 'PRACTICE');

-- CreateEnum
CREATE TYPE "SubscriptionPlanType" AS ENUM ('SUBJECT', 'SUBJECT_BUNDLE', 'TOPIC');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CORRECTION');

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "admin_note" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" INTEGER,
ADD COLUMN     "status" "QuestionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "tests" ADD COLUMN     "test_group_id" INTEGER,
ADD COLUMN     "time_limit" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "profile_image" TEXT;

-- CreateTable
CREATE TABLE "curriculum" (
    "id" SERIAL NOT NULL,
    "class_level" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "chapter" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "group_type" "TestGroupType" NOT NULL,
    "class_level" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "chapter" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_group_questions" (
    "id" SERIAL NOT NULL,
    "test_group_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_group_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SubscriptionPlanType" NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "offer_price" DOUBLE PRECISION,
    "offer_end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "topic" TEXT,
    "class_level" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_subjects" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,

    CONSTRAINT "subscription_plan_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "subscription_id" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "paytm_order_id" TEXT NOT NULL,
    "paytm_txn_id" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "curriculum_class_level_idx" ON "curriculum"("class_level");

-- CreateIndex
CREATE INDEX "curriculum_class_level_subject_idx" ON "curriculum"("class_level", "subject");

-- CreateIndex
CREATE INDEX "curriculum_class_level_subject_chapter_idx" ON "curriculum"("class_level", "subject", "chapter");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_class_level_subject_chapter_topic_key" ON "curriculum"("class_level", "subject", "chapter", "topic");

-- CreateIndex
CREATE INDEX "test_groups_class_level_topic_idx" ON "test_groups"("class_level", "topic");

-- CreateIndex
CREATE INDEX "test_groups_class_level_subject_idx" ON "test_groups"("class_level", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "test_group_questions_test_group_id_question_id_key" ON "test_group_questions"("test_group_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_subjects_plan_id_subject_key" ON "subscription_plan_subjects"("plan_id", "subject");

-- CreateIndex
CREATE INDEX "subscriptions_student_id_idx" ON "subscriptions"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paytm_order_id_key" ON "payments"("paytm_order_id");

-- CreateIndex
CREATE INDEX "payments_student_id_idx" ON "payments"("student_id");

-- CreateIndex
CREATE INDEX "questions_status_idx" ON "questions"("status");

-- CreateIndex
CREATE INDEX "questions_created_by_status_idx" ON "questions"("created_by", "status");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_groups" ADD CONSTRAINT "test_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_group_questions" ADD CONSTRAINT "test_group_questions_test_group_id_fkey" FOREIGN KEY ("test_group_id") REFERENCES "test_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_group_questions" ADD CONSTRAINT "test_group_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_subjects" ADD CONSTRAINT "subscription_plan_subjects_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
