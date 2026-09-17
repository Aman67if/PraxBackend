import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import { SubscriptionPlanType, BillingCycle } from '@prisma/client';

// ─── Create subscription plan (admin) ─────────────────────────────────────────
interface CreatePlanInput {
  name: string;
  type: SubscriptionPlanType;
  billing_cycle: BillingCycle;
  price: number;
  offer_price?: number;
  offer_end_date?: Date;
  subjects?: string[];
  topic?: string;
  class_level?: number;
}

export async function createPlan(input: CreatePlanInput) {
  const { name, type, billing_cycle, price, offer_price, offer_end_date, subjects, topic, class_level } = input;

  if (type === 'SUBJECT' && (!subjects || subjects.length !== 1)) {
    throw new AppError('SUBJECT type requires exactly one subject.', 400);
  }
  if (type === 'SUBJECT_BUNDLE' && (!subjects || subjects.length < 2)) {
    throw new AppError('SUBJECT_BUNDLE type requires at least two subjects.', 400);
  }
  if (type === 'TOPIC' && !topic) {
    throw new AppError('TOPIC type requires a topic name.', 400);
  }

  const plan = await prisma.subscriptionPlan.create({
    data: {
      name,
      type,
      billing_cycle,
      price,
      offer_price: offer_price ?? null,
      offer_end_date: offer_end_date ?? null,
      topic: topic ?? null,
      class_level: class_level ?? null,
      subjects: subjects
        ? { create: subjects.map(s => ({ subject: s })) }
        : undefined,
    },
    include: { subjects: true },
  });

  return plan;
}

// ─── Update subscription plan (admin) ─────────────────────────────────────────
interface UpdatePlanInput {
  name?: string;
  price?: number;
  offer_price?: number | null;
  offer_end_date?: Date | null;
  is_active?: boolean;
}

export async function updatePlan(id: number, input: UpdatePlanInput) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan) throw new AppError('Subscription plan not found.', 404);

  return prisma.subscriptionPlan.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.offer_price !== undefined && { offer_price: input.offer_price }),
      ...(input.offer_end_date !== undefined && { offer_end_date: input.offer_end_date }),
      ...(input.is_active !== undefined && { is_active: input.is_active }),
    },
    include: { subjects: true },
  });
}

// ─── Delete subscription plan (admin) ─────────────────────────────────────────
export async function deletePlan(id: number) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan) throw new AppError('Subscription plan not found.', 404);

  // Soft delete by marking is_active=false, or hard delete if you prefer.
  // We'll hard delete it for now, unless it has active subscriptions.
  const activeSubs = await prisma.subscription.count({
    where: { plan_id: id, is_active: true }
  });

  if (activeSubs > 0) {
    throw new AppError('Cannot delete plan with active subscriptions. You can deactivate it instead.', 400);
  }

  return prisma.subscriptionPlan.delete({ where: { id } });
}

// ─── List all plans (admin) ───────────────────────────────────────────────────
export async function listPlans(includeInactive = false) {
  return prisma.subscriptionPlan.findMany({
    where: includeInactive ? {} : { is_active: true },
    orderBy: { created_at: 'desc' },
    include: {
      subjects: true,
      _count: { select: { subscriptions: true } },
    },
  });
}

// ─── Get available plans for students ─────────────────────────────────────────
export async function getStudentPlans() {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { is_active: true },
    orderBy: [{ type: 'asc' }, { price: 'asc' }],
    include: { subjects: true },
  });

  // Mark offers that have expired
  return plans.map(p => ({
    ...p,
    has_active_offer: p.offer_price != null && p.offer_end_date != null && p.offer_end_date > new Date(),
    effective_price: (p.offer_price != null && p.offer_end_date != null && p.offer_end_date > new Date())
      ? p.offer_price
      : p.price,
  }));
}

// ─── Subscribe to a plan (after payment) ──────────────────────────────────────
export async function subscribeToPlan(studentId: number, planId: number) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.is_active) throw new AppError('Subscription plan not found or inactive.', 404);

  const now = new Date();
  const endDate = new Date(now);
  if (plan.billing_cycle === 'MONTHLY') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  // Check for existing active subscription to same plan
  const existing = await prisma.subscription.findFirst({
    where: {
      student_id: studentId,
      plan_id: planId,
      is_active: true,
      end_date: { gt: now },
    },
  });

  if (existing) {
    throw new AppError('You already have an active subscription to this plan.', 400);
  }

  return prisma.subscription.create({
    data: {
      student_id: studentId,
      plan_id: planId,
      start_date: now,
      end_date: endDate,
    },
    include: { plan: { include: { subjects: true } } },
  });
}

// ─── Get student's active subscriptions ───────────────────────────────────────
export async function getStudentSubscriptions(studentId: number) {
  return prisma.subscription.findMany({
    where: {
      student_id: studentId,
      is_active: true,
      end_date: { gt: new Date() },
    },
    include: { plan: { include: { subjects: true } } },
    orderBy: { end_date: 'desc' },
  });
}
