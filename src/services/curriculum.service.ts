import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import { cacheGet, cacheSet, cacheInvalidate } from '../utils/cache';

const CACHE_TTL = 600; // 10 minutes

// ─── Get full curriculum tree ─────────────────────────────────────────────────
export async function getCurriculum() {
  const cacheKey = 'curriculum:all';
  const cached = await cacheGet<any[]>(cacheKey);
  if (cached) return cached;

  const data = await prisma.curriculum.findMany({
    orderBy: [
      { class_level: 'asc' },
      { subject: 'asc' },
      { chapter: 'asc' },
      { topic: 'asc' },
    ],
  });

  await cacheSet(cacheKey, data, CACHE_TTL);
  return data;
}

// ─── Get distinct class levels ────────────────────────────────────────────────
export async function getClasses() {
  const cacheKey = 'curriculum:classes';
  const cached = await cacheGet<number[]>(cacheKey);
  if (cached) return cached;

  const rows = await prisma.curriculum.findMany({
    select: { class_level: true },
    distinct: ['class_level'],
    orderBy: { class_level: 'asc' },
  });
  const data = rows.map(r => r.class_level);

  await cacheSet(cacheKey, data, CACHE_TTL);
  return data;
}

// ─── Get subjects for a class ─────────────────────────────────────────────────
export async function getSubjects(classLevel: number) {
  const cacheKey = `curriculum:subjects:${classLevel}`;
  const cached = await cacheGet<string[]>(cacheKey);
  if (cached) return cached;

  const rows = await prisma.curriculum.findMany({
    where: { class_level: classLevel },
    select: { subject: true },
    distinct: ['subject'],
    orderBy: { subject: 'asc' },
  });
  const data = rows.map(r => r.subject);

  await cacheSet(cacheKey, data, CACHE_TTL);
  return data;
}

// ─── Get chapters for class + subject ─────────────────────────────────────────
export async function getChapters(classLevel: number, subject: string) {
  const cacheKey = `curriculum:chapters:${classLevel}:${subject}`;
  const cached = await cacheGet<string[]>(cacheKey);
  if (cached) return cached;

  const rows = await prisma.curriculum.findMany({
    where: { class_level: classLevel, subject },
    select: { chapter: true },
    distinct: ['chapter'],
    orderBy: { chapter: 'asc' },
  });
  const data = rows.map(r => r.chapter);

  await cacheSet(cacheKey, data, CACHE_TTL);
  return data;
}

// ─── Get topics for class + subject + chapter ─────────────────────────────────
export async function getTopics(classLevel: number, subject: string, chapter: string) {
  const cacheKey = `curriculum:topics:${classLevel}:${subject}:${chapter}`;
  const cached = await cacheGet<string[]>(cacheKey);
  if (cached) return cached;

  const rows = await prisma.curriculum.findMany({
    where: { class_level: classLevel, subject, chapter },
    select: { topic: true },
    distinct: ['topic'],
    orderBy: { topic: 'asc' },
  });
  const data = rows.map(r => r.topic);

  await cacheSet(cacheKey, data, CACHE_TTL);
  return data;
}

// ─── Create new curriculum entry (admin) ──────────────────────────────────────
export async function createCurriculumEntry(data: {
  class_level: number;
  subject: string;
  chapter: string;
  topic: string;
}) {
  const { class_level, subject, chapter, topic } = data;

  // Validation: all fields required
  if (!class_level || !subject?.trim() || !chapter?.trim() || !topic?.trim()) {
    throw new AppError(
      'All fields are required: class_level, subject, chapter, and topic. ' +
      'A class cannot be created without subject, chapter, and topic.',
      400
    );
  }

  // Check for duplicate
  const existing = await prisma.curriculum.findUnique({
    where: {
      class_level_subject_chapter_topic: {
        class_level,
        subject: subject.trim(),
        chapter: chapter.trim(),
        topic: topic.trim(),
      },
    },
  });

  if (existing) {
    throw new AppError('This curriculum entry already exists.', 409);
  }

  const entry = await prisma.curriculum.create({
    data: {
      class_level,
      subject: subject.trim(),
      chapter: chapter.trim(),
      topic: topic.trim(),
    },
  });

  // Invalidate all curriculum cache keys so fresh data is fetched
  await cacheInvalidate('curriculum:*');

  return entry;
}
