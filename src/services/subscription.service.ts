import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import { Role } from '@prisma/client';

export const SUBSCRIPTION_DAYS    = 365; // 1 year
export const FREE_WARMUP_LIMIT    = 5;   // max warmup tests per subject for unsubscribed students
export const ACTUAL_QUESTION_COUNT = 20;
export const WARMUP_QUESTION_COUNT = 10;

// ─── Check active subscription ────────────────────────────────────────────────
export async function hasActiveSubscription(
  studentId:  number,
  classLevel: number
): Promise<boolean> {
  const sub = await prisma.classSubscription.findFirst({
    where: {
      student_id:  studentId,
      class_level: classLevel,
      end_date:    { gt: new Date() },
    },
  });
  return !!sub;
}

// ─── Get all subscriptions for a student ─────────────────────────────────────
export async function getStudentSubscriptions(studentId: number) {
  return prisma.classSubscription.findMany({
    where:   { student_id: studentId },
    orderBy: { class_level: 'asc' },
  });
}

// ─── Count warmup tests for unsubscribed limit check ─────────────────────────
export async function getWarmupCount(
  studentId:  number,
  classLevel: number,
  subject:    string
): Promise<number> {
  return prisma.test.count({
    where: {
      student_id:   studentId,
      class_level:  classLevel,
      subject:      subject,
      test_type:    'WARMUP',
      is_free_tier: true,
    },
  });
}

// ─── Add / renew class subscription (admin) ───────────────────────────────────
export async function addClassSubscription(studentId: number, classLevel: number) {
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== Role.STUDENT) throw new AppError('Student not found.', 404);

  const now     = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + SUBSCRIPTION_DAYS);

  const existing = await prisma.classSubscription.findUnique({
    where: { student_id_class_level: { student_id: studentId, class_level: classLevel } },
  });

  if (existing) {
    // Extend from current end_date if still active, else start fresh from now
    const base     = existing.end_date > now ? existing.end_date : now;
    const extended = new Date(base);
    extended.setDate(extended.getDate() + SUBSCRIPTION_DAYS);

    return prisma.classSubscription.update({
      where: { student_id_class_level: { student_id: studentId, class_level: classLevel } },
      data:  { start_date: now, end_date: extended },
    });
  }

  return prisma.classSubscription.create({
    data: { student_id: studentId, class_level: classLevel, start_date: now, end_date: endDate },
  });
}

// ─── Extend subscription (admin) ──────────────────────────────────────────────
export async function extendClassSubscription(
  studentId:  number,
  classLevel: number,
  extraDays:  number
) {
  const now = new Date();
  const sub = await prisma.classSubscription.findUnique({
    where: { student_id_class_level: { student_id: studentId, class_level: classLevel } },
  });
  if (!sub) throw new AppError('Subscription not found.', 404);

  const base     = sub.end_date > now ? sub.end_date : now;
  const extended = new Date(base);
  extended.setDate(extended.getDate() + extraDays);

  return prisma.classSubscription.update({
    where: { student_id_class_level: { student_id: studentId, class_level: classLevel } },
    data:  { end_date: extended },
  });
}

// ─── Remove subscription (admin) ──────────────────────────────────────────────
export async function removeClassSubscription(studentId: number, classLevel: number) {
  const sub = await prisma.classSubscription.findUnique({
    where: { student_id_class_level: { student_id: studentId, class_level: classLevel } },
  });
  if (!sub) throw new AppError('Subscription not found.', 404);
  return prisma.classSubscription.delete({
    where: { student_id_class_level: { student_id: studentId, class_level: classLevel } },
  });
}