import prisma from "../config/prisma";
import { AppError } from "../utils/AppError";
import { QuestionContent } from "../types";
import { Difficulty, QuestionStatus, Role } from "@prisma/client";
import { cacheGet, cacheSet, cacheInvalidate } from "../utils/cache";

const CACHE_TTL = 300; // 5 minutes

interface CreateQuestionInput {
  class_level: number;
  subject: string;
  chapter: string;
  topic: string;
  content: QuestionContent;
  correct_option: number;
  difficulty?: Difficulty;
  created_by: number;
}

interface ListQuestionsFilter {
  class_level?: number;
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: Difficulty;
  status?: QuestionStatus;
  page?: number;
  limit?: number;
}

// ─── Create question (always PENDING) ─────────────────────────────────────────
export async function createQuestion(data: CreateQuestionInput) {
  const question = await prisma.question.create({
    data: {
      class_level: data.class_level,
      subject: data.subject,
      chapter: data.chapter,
      topic: data.topic,
      content: data.content as any,
      correct_option: data.correct_option,
      difficulty: data.difficulty || Difficulty.EASY,
      created_by: data.created_by,
      status: QuestionStatus.PENDING,
    },
  });

  await cacheInvalidate("questions:*");
  return question;
}

// ─── Get questions with filters (role-aware) ──────────────────────────────────
export async function getQuestions(filter: ListQuestionsFilter, role?: Role) {
  const page = filter.page || 1;
  const limit = filter.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = { is_active: true };
  if (filter.class_level) where.class_level = filter.class_level;
  if (filter.subject) where.subject = filter.subject;
  if (filter.chapter) where.chapter = filter.chapter;
  if (filter.topic) where.topic = filter.topic;
  if (filter.difficulty) where.difficulty = filter.difficulty;

  // Non-admin users can only see APPROVED questions
  if (filter.status) {
    where.status = filter.status;
  } else if (role !== Role.ADMIN) {
    where.status = QuestionStatus.APPROVED;
  }

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        class_level: true,
        subject: true,
        chapter: true,
        topic: true,
        difficulty: true,
        content: true,
        correct_option: true,
        status: true,
        admin_note: true,
        created_at: true,
        creator: { select: { id: true, name: true } },
      },
    }),
    prisma.question.count({ where }),
  ]);

  return {
    questions,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}

// ─── Get single question by ID ────────────────────────────────────────────────
export async function getQuestionById(id: number) {
  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });
  if (!question || !question.is_active) {
    throw new AppError("Question not found.", 404);
  }
  return question;
}

// ─── Search by question ID (with access control) ─────────────────────────────
export async function searchQuestionById(
  questionId: number,
  requestingUserId?: number,
  isAdmin?: boolean
) {
  const question = await prisma.question.findUnique({
    where: { id: questionId, is_active: true },
    include: {
      creator: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });

  if (!question) {
    throw new AppError("Question not found.", 404);
  }

  // Employee can only see own questions
  if (!isAdmin && requestingUserId && question.created_by !== requestingUserId) {
    throw new AppError("You do not have permission to view this question.", 403);
  }

  return question;
}

// ─── Search questions by filters (admin) ──────────────────────────────────────
interface AdminSearchFilter {
  class_level?: number;
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: Difficulty;
  month?: number;     // 1-12
  year?: number;      // e.g. 2026
  employee_id?: number;
  status?: QuestionStatus;
  page?: number;
  limit?: number;
}

export async function searchQuestionsByFilters(filter: AdminSearchFilter) {
  const page = filter.page || 1;
  const limit = filter.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = { is_active: true };
  if (filter.class_level) where.class_level = filter.class_level;
  if (filter.subject) where.subject = filter.subject;
  if (filter.chapter) where.chapter = filter.chapter;
  if (filter.topic) where.topic = filter.topic;
  if (filter.difficulty) where.difficulty = filter.difficulty;
  if (filter.status) where.status = filter.status;
  if (filter.employee_id) where.created_by = filter.employee_id;

  // Month/year filter for creation date
  if (filter.month && filter.year) {
    const startDate = new Date(filter.year, filter.month - 1, 1);
    const endDate = new Date(filter.year, filter.month, 0, 23, 59, 59, 999);
    where.created_at = { gte: startDate, lte: endDate };
  } else if (filter.month) {
    // Current year if year not specified
    const year = new Date().getFullYear();
    const startDate = new Date(year, filter.month - 1, 1);
    const endDate = new Date(year, filter.month, 0, 23, 59, 59, 999);
    where.created_at = { gte: startDate, lte: endDate };
  }

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        class_level: true,
        subject: true,
        chapter: true,
        topic: true,
        difficulty: true,
        content: true,
        correct_option: true,
        status: true,
        admin_note: true,
        created_at: true,
        reviewed_at: true,
        creator: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
      },
    }),
    prisma.question.count({ where }),
  ]);

  return {
    questions,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}

// ─── Employee search (scoped to own questions) ────────────────────────────────
export async function searchQuestionsByEmployee(
  employeeId: number,
  filter: Omit<AdminSearchFilter, 'employee_id'>
) {
  return searchQuestionsByFilters({ ...filter, employee_id: employeeId });
}

// ─── Get all entered questions (admin view) ───────────────────────────────────
export async function getAllEnteredQuestions(page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where: { is_active: true },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        class_level: true,
        subject: true,
        chapter: true,
        topic: true,
        difficulty: true,
        content: true,
        correct_option: true,
        status: true,
        admin_note: true,
        created_at: true,
        reviewed_at: true,
        creator: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
      },
    }),
    prisma.question.count({ where: { is_active: true } }),
  ]);

  return {
    questions,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}

// ─── Update question status (admin action) ────────────────────────────────────
export async function updateQuestionStatus(
  questionId: number,
  status: QuestionStatus,
  reviewedBy: number,
  adminNote?: string
) {
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question || !question.is_active) {
    throw new AppError("Question not found.", 404);
  }

  const updated = await prisma.question.update({
    where: { id: questionId },
    data: {
      status,
      admin_note: adminNote || null,
      reviewed_by: reviewedBy,
      reviewed_at: new Date(),
    },
    include: {
      creator: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });

  await cacheInvalidate("questions:*");
  return updated;
}

// ─── Employee: get CORRECTION questions ───────────────────────────────────────
export async function getEmployeePendingCorrections(
  employeeId: number,
  filter: { class_level?: number; subject?: string; chapter?: string; topic?: string; page?: number; limit?: number }
) {
  const page = filter.page || 1;
  const limit = filter.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = {
    created_by: employeeId,
    status: QuestionStatus.CORRECTION,
    is_active: true,
  };
  if (filter.class_level) where.class_level = filter.class_level;
  if (filter.subject) where.subject = filter.subject;
  if (filter.chapter) where.chapter = filter.chapter;
  if (filter.topic) where.topic = filter.topic;

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        class_level: true,
        subject: true,
        chapter: true,
        topic: true,
        difficulty: true,
        content: true,
        correct_option: true,
        status: true,
        admin_note: true,
        created_at: true,
        reviewed_at: true,
        creator: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
      },
    }),
    prisma.question.count({ where }),
  ]);

  return {
    questions,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}

// ─── Employee: get REJECTED questions ─────────────────────────────────────────
export async function getEmployeeRejectedQuestions(
  employeeId: number,
  filter: { class_level?: number; subject?: string; chapter?: string; topic?: string; page?: number; limit?: number }
) {
  const page = filter.page || 1;
  const limit = filter.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = {
    created_by: employeeId,
    status: QuestionStatus.REJECTED,
    is_active: true,
  };
  if (filter.class_level) where.class_level = filter.class_level;
  if (filter.subject) where.subject = filter.subject;
  if (filter.chapter) where.chapter = filter.chapter;
  if (filter.topic) where.topic = filter.topic;

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        class_level: true,
        subject: true,
        chapter: true,
        topic: true,
        difficulty: true,
        content: true,
        correct_option: true,
        status: true,
        admin_note: true,
        created_at: true,
        reviewed_at: true,
        creator: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
      },
    }),
    prisma.question.count({ where }),
  ]);

  return {
    questions,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}

// ─── Employee: edit own question (resets to PENDING) ──────────────────────────
export async function updateQuestionByEmployee(
  questionId: number,
  employeeId: number,
  data: Partial<CreateQuestionInput>
) {
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question || !question.is_active) {
    throw new AppError("Question not found.", 404);
  }
  if (question.created_by !== employeeId) {
    throw new AppError("You can only edit your own questions.", 403);
  }
  if (question.status !== QuestionStatus.PENDING && question.status !== QuestionStatus.CORRECTION && question.status !== QuestionStatus.REJECTED) {
    throw new AppError("You can only edit questions that are pending, sent back for correction, or rejected.", 400);
  }

  const updated = await prisma.question.update({
    where: { id: questionId },
    data: {
      ...(data.class_level !== undefined && { class_level: data.class_level }),
      ...(data.subject && { subject: data.subject }),
      ...(data.chapter && { chapter: data.chapter }),
      ...(data.topic && { topic: data.topic }),
      ...(data.content && { content: data.content as any }),
      ...(data.correct_option !== undefined && { correct_option: data.correct_option }),
      ...(data.difficulty && { difficulty: data.difficulty }),
      status: QuestionStatus.PENDING,
      admin_note: null,
      reviewed_by: null,
      reviewed_at: null,
    },
  });

  await cacheInvalidate("questions:*");
  return updated;
}

// ─── Update question (admin/employee - original) ──────────────────────────────
export async function updateQuestion(
  id: number,
  data: Partial<CreateQuestionInput>,
) {
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question || !question.is_active)
    throw new AppError("Question not found.", 404);

  const updated = await prisma.question.update({
    where: { id },
    data: {
      ...(data.class_level !== undefined && { class_level: data.class_level }),
      ...(data.subject && { subject: data.subject }),
      ...(data.chapter && { chapter: data.chapter }),
      ...(data.topic && { topic: data.topic }),
      ...(data.content && { content: data.content as any }),
      ...(data.correct_option !== undefined && {
        correct_option: data.correct_option,
      }),
      ...(data.difficulty && { difficulty: data.difficulty }),
    },
  });

  await cacheInvalidate("questions:*");
  return updated;
}

// ─── Delete question (soft delete) ────────────────────────────────────────────
export async function deleteQuestion(id: number) {
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question || !question.is_active)
    throw new AppError("Question not found.", 404);

  const deleted = await prisma.question.update({
    where: { id },
    data: { is_active: false },
  });

  await cacheInvalidate("questions:*");
  return deleted;
}

// ─── Get employees list (for admin filter dropdown) ───────────────────────────
export async function getEmployeesList() {
  const cacheKey = "employees:list";
  const cached = await cacheGet<any[]>(cacheKey);
  if (cached) return cached;

  const employees = await prisma.user.findMany({
    where: { role: Role.EMPLOYEE, is_active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  await cacheSet(cacheKey, employees, CACHE_TTL);
  return employees;
}
