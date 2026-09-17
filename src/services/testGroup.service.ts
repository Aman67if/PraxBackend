import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import { TestGroupType } from '@prisma/client';

// ─── Create test group ────────────────────────────────────────────────────────
interface CreateTestGroupInput {
  name: string;
  group_type: TestGroupType;
  class_level: number;
  subject: string;
  chapter: string;
  topic: string;
  time_limit: number; // total seconds
  is_paid: boolean;
  question_ids: number[];
  created_by: number;
}

export async function createTestGroup(input: CreateTestGroupInput) {
  const {
    name, group_type, class_level, subject, chapter, topic,
    time_limit, is_paid, question_ids, created_by,
  } = input;

  if (!question_ids.length) {
    throw new AppError('At least one question must be selected.', 400);
  }

  // Verify all questions exist and are active
  const questions = await prisma.question.findMany({
    where: { id: { in: question_ids }, is_active: true },
    select: { id: true },
  });

  if (questions.length !== question_ids.length) {
    throw new AppError('Some selected questions were not found or are inactive.', 400);
  }

  const group = await prisma.testGroup.create({
    data: {
      name,
      group_type,
      class_level,
      subject,
      chapter,
      topic,
      time_limit,
      is_paid,
      created_by,
      questions: {
        create: question_ids.map(qid => ({
          question_id: qid,
        })),
      },
    },
    include: {
      questions: { include: { question: { select: { id: true, difficulty: true } } } },
      creator: { select: { id: true, name: true } },
    },
  });

  return group;
}

// ─── List test groups with filters ────────────────────────────────────────────
interface ListTestGroupsFilter {
  class_level?: number;
  subject?: string;
  topic?: string;
  group_type?: TestGroupType;
  is_active?: boolean;
}

export async function getTestGroups(filter: ListTestGroupsFilter) {
  const where: any = {};

  if (filter.class_level) where.class_level = filter.class_level;
  if (filter.subject) where.subject = filter.subject;
  if (filter.topic) where.topic = filter.topic;
  if (filter.group_type) where.group_type = filter.group_type;
  if (filter.is_active !== undefined) where.is_active = filter.is_active;

  const groups = await prisma.testGroup.findMany({
    where,
    orderBy: { created_at: 'desc' },
    include: {
      _count: { select: { questions: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  return groups;
}

// ─── Get single test group by ID ──────────────────────────────────────────────
export async function getTestGroupById(id: number) {
  const group = await prisma.testGroup.findUnique({
    where: { id },
    include: {
      questions: {
        include: {
          question: {
            select: {
              id: true,
              class_level: true,
              subject: true,
              chapter: true,
              topic: true,
              content: true,
              difficulty: true,
            },
          },
        },
      },
      creator: { select: { id: true, name: true } },
    },
  });

  if (!group) throw new AppError('Test group not found.', 404);
  return group;
}

// ─── Get questions for group selection (admin) ────────────────────────────────
interface QuestionsForGroupFilter {
  class_level?: number;
  subject?: string;
  chapter?: string;
  topic?: string;
  page?: number;
  limit?: number;
}

export async function getQuestionsForGroupSelection(filter: QuestionsForGroupFilter) {
  const page = filter.page || 1;
  const limit = filter.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = { is_active: true, status: 'APPROVED' };
  if (filter.class_level) where.class_level = filter.class_level;
  if (filter.subject) where.subject = filter.subject;
  if (filter.chapter) where.chapter = filter.chapter;
  if (filter.topic) where.topic = filter.topic;

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        class_level: true,
        subject: true,
        chapter: true,
        topic: true,
        content: true,
        difficulty: true,
        test_group_questions: {
          select: {
            test_group: {
              select: {
                id: true,
                name: true,
                group_type: true,
                class_level: true,
                topic: true,
              },
            },
          },
        },
      },
    }),
    prisma.question.count({ where }),
  ]);

  // Transform to include group membership info
  const result = questions.map(q => ({
    id: q.id,
    class_level: q.class_level,
    subject: q.subject,
    chapter: q.chapter,
    topic: q.topic,
    content: q.content,
    difficulty: q.difficulty,
    is_in_group: q.test_group_questions.length > 0,
    groups: q.test_group_questions.map(tgq => tgq.test_group),
  }));

  return {
    questions: result,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}

// ─── Delete test group ────────────────────────────────────────────────────────
export async function deleteTestGroup(id: number) {
  const group = await prisma.testGroup.findUnique({ where: { id } });
  if (!group) throw new AppError('Test group not found.', 404);

  await prisma.testGroup.update({
    where: { id },
    data: { is_active: false },
  });

  return { message: 'Test group deactivated.' };
}
