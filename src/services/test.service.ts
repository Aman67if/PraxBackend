import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import { processQuestionForTest } from '../utils/shuffleOptions';
import {
  hasActiveSubscription,
  getWarmupCount,
  FREE_WARMUP_LIMIT,
  ACTUAL_QUESTION_COUNT,
  WARMUP_QUESTION_COUNT,
} from './subscription.service';
import {
  TestQuestionSnapshot, FrontendQuestion,
  SubmitAnswerItem, TestResultResponse,
  ResultBreakdownItem, QuestionContent,
} from '../types';

type TestType  = 'ACTUAL' | 'WARMUP';
type DiffInput = 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';

// ─── Start Test ───────────────────────────────────────────────────────────────
interface StartTestInput {
  student_id:  number;
  class_level: number;
  subject:     string;       // required for both test types
  chapter?:    string;
  test_type:   TestType;
  difficulty:  DiffInput;
}

export async function startTest(input: StartTestInput) {
  const { student_id, class_level, subject, chapter, test_type, difficulty } = input;

  const subscribed = await hasActiveSubscription(student_id, class_level);
  const isFreeTier = !subscribed;

  // ── Guard: ACTUAL test requires subscription ──────────────────────────────
  if (test_type === 'ACTUAL' && isFreeTier) {
    throw new AppError(
      `You need an active Class ${class_level} subscription to take an actual test. ` +
      `Please contact your administrator to purchase a subscription.`,
      403
    );
  }

  // ── Guard: WARMUP limit for unsubscribed students ─────────────────────────
  if (test_type === 'WARMUP' && isFreeTier) {
    const warmupCount = await getWarmupCount(student_id, class_level, subject);
    if (warmupCount >= FREE_WARMUP_LIMIT) {
      throw new AppError(
        `WARMUP_LIMIT_REACHED:You have used all ${FREE_WARMUP_LIMIT} free warm-up tests for ` +
        `${subject} (Class ${class_level}). Subscribe to Class ${class_level} to continue ` +
        `practising with unlimited warm-up tests and unlock actual tests.`,
        403
      );
    }
  }

  // ── Question count ────────────────────────────────────────────────────────
  const questionCount = test_type === 'ACTUAL' ? ACTUAL_QUESTION_COUNT : WARMUP_QUESTION_COUNT;

  // ── Build difficulty SQL filter ───────────────────────────────────────────
  const difficultyFilter =
    difficulty === 'MIXED' ? '' : `AND difficulty = '${difficulty}'`;

  // ── Build param list dynamically ──────────────────────────────────────────
  const params: any[] = [class_level, subject];
  if (chapter) params.push(chapter);
  params.push(questionCount);

  const chapterFilter = chapter ? `AND chapter = $3` : '';
  const limitParam    = `$${params.length}`;

  const randomIds = await prisma.$queryRawUnsafe<{ id: number }[]>(
    `SELECT id FROM questions
     WHERE is_active    = true
       AND class_level  = $1
       AND subject      = $2
       ${chapterFilter}
       ${difficultyFilter}
     ORDER BY RANDOM()
     LIMIT ${limitParam}`,
    ...params
  );

  if (randomIds.length === 0) {
    throw new AppError(
      `No ${difficulty === 'MIXED' ? '' : difficulty.toLowerCase() + ' '}questions found ` +
      `for ${subject} (Class ${class_level})${chapter ? `, Chapter: ${chapter}` : ''}.`,
      404
    );
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: randomIds.map(r => r.id) } },
  });

  // ── Shuffle options for each question ─────────────────────────────────────
  const snapshots:         TestQuestionSnapshot[] = [];
  const frontendQuestions: FrontendQuestion[]     = [];

  for (const q of questions) {
    const { snapshot, frontend } = processQuestionForTest(
      q.id,
      q.content as unknown as QuestionContent,
      q.correct_option
    );
    snapshots.push(snapshot);
    frontendQuestions.push(frontend);
  }

  // ── Persist test ──────────────────────────────────────────────────────────
  const test = await prisma.test.create({
    data: {
      student_id:    student_id,
      class_level:   class_level,
      subject:       subject,
      chapter:       chapter ?? null,
      test_type:     test_type,
      difficulty:    difficulty,
      is_free_tier:  isFreeTier,
      test_questions: snapshots as any,
    },
  });

  // ── Build warmup usage info for unsubscribed students ────────────────────
  let warmupInfo: object | undefined;
  if (test_type === 'WARMUP' && isFreeTier) {
    const used = await getWarmupCount(student_id, class_level, subject);
    const remaining = FREE_WARMUP_LIMIT - used;
    warmupInfo = {
      tests_used:      used,
      tests_remaining: remaining,
      tests_limit:     FREE_WARMUP_LIMIT,
      subject,
      class_level,
    };
  }

  return {
    test_id:         test.id,
    test_type,
    difficulty,
    is_free_tier:    isFreeTier,
    total_questions: frontendQuestions.length,
    ...(warmupInfo && { warmup_usage: warmupInfo }),
    questions:       frontendQuestions,
  };
}

// ─── Submit Test ──────────────────────────────────────────────────────────────
export async function submitTest(
  studentId: number,
  testId:    number,
  answers:   SubmitAnswerItem[]
) {
  const test = await prisma.test.findUnique({ where: { id: testId } });

  if (!test)                         throw new AppError('Test not found.', 404);
  if (test.student_id !== studentId) throw new AppError('Access denied.', 403);
  if (test.status === 'SUBMITTED')   throw new AppError('Test already submitted.', 400);

  const snapshots = test.test_questions as unknown as TestQuestionSnapshot[];
  const answerMap = new Map<number, number>();
  for (const a of answers) answerMap.set(a.question_id, a.selected_option);

  let correct = 0, incorrect = 0, unattempted = 0;
  for (const snap of snapshots) {
    const selected = answerMap.get(snap.question_id);
    if (selected === undefined)            unattempted++;
    else if (selected === snap.correct_option) correct++;
    else                                   incorrect++;
  }

  const total    = snapshots.length;
  const score    = correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

  const updated = await prisma.test.update({
    where: { id: testId },
    data: {
      status:          'SUBMITTED',
      answers:         answers as any,
      score,
      correct_count:   correct,
      incorrect_count: incorrect,
      accuracy,
      submitted_at:    new Date(),
    },
  });

  return {
    test_id:           testId,
    test_type:         test.test_type,
    difficulty:        test.difficulty,
    is_free_tier:      test.is_free_tier,
    score,
    correct_count:     correct,
    incorrect_count:   incorrect,
    unattempted_count: unattempted,
    total_questions:   total,
    accuracy,
    submitted_at:      updated.submitted_at!,
  };
}

// ─── Get Test Result ──────────────────────────────────────────────────────────
export async function getTestResult(
  studentId: number,
  testId:    number
): Promise<TestResultResponse> {
  const test = await prisma.test.findUnique({ where: { id: testId } });

  if (!test)                         throw new AppError('Test not found.', 404);
  if (test.student_id !== studentId) throw new AppError('Access denied.', 403);
  if (test.status !== 'SUBMITTED')   throw new AppError('Test not submitted yet.', 400);

  const snapshots       = test.test_questions as unknown as TestQuestionSnapshot[];
  const submittedAnswers = (test.answers as unknown as SubmitAnswerItem[]) || [];

  const answerMap = new Map<number, number>();
  for (const a of submittedAnswers) answerMap.set(a.question_id, a.selected_option);

  const breakdown: ResultBreakdownItem[] = snapshots.map(snap => {
    const selected  = answerMap.get(snap.question_id) ?? null;
    const isCorrect = selected !== null && selected === snap.correct_option;
    return {
      question_id:     snap.question_id,
      question:        snap.question_content.question,
      options:         snap.question_content.options,
      selected_option: selected,
      correct_option:  snap.correct_option,
      is_correct:      isCorrect,
      explanation:     snap.question_content.explanation,
    };
  });

  return {
    test_id:           testId,
    test_type:         test.test_type,
    difficulty:        test.difficulty,
    is_free_tier:      test.is_free_tier,
    score:             test.score!,
    correct_count:     test.correct_count!,
    incorrect_count:   test.incorrect_count!,
    unattempted_count: breakdown.filter(b => b.selected_option === null).length,
    total_questions:   snapshots.length,
    accuracy:          test.accuracy!,
    submitted_at:      test.submitted_at!,
    breakdown,
  };
}

// ─── Get warmup usage for a student (for dashboard display) ──────────────────
export async function getWarmupUsage(
  studentId:  number,
  classLevel: number,
  subjects:   string[]
) {
  const subscribed = await hasActiveSubscription(studentId, classLevel);

  const usage = await Promise.all(
    subjects.map(async (subject) => {
      const used = await getWarmupCount(studentId, classLevel, subject);
      return {
        subject,
        used,
        limit:      FREE_WARMUP_LIMIT,
        remaining:  Math.max(0, FREE_WARMUP_LIMIT - used),
        exhausted:  used >= FREE_WARMUP_LIMIT,
      };
    })
  );

  return { subscribed, class_level: classLevel, usage };
}

// ─── Student test history ─────────────────────────────────────────────────────
export async function getStudentTests(studentId: number, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const [tests, total] = await Promise.all([
    prisma.test.findMany({
      where:   { student_id: studentId },
      skip, take: limit,
      orderBy: { created_at: 'desc' },
      select: {
        id: true, class_level: true, subject: true, chapter: true,
        test_type: true, difficulty: true, is_free_tier: true,
        status: true, score: true, correct_count: true,
        incorrect_count: true, accuracy: true,
        started_at: true, submitted_at: true,
      },
    }),
    prisma.test.count({ where: { student_id: studentId } }),
  ]);
  return { tests, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

// ─── Start Test from Test Group ───────────────────────────────────────────────
export async function startTestFromGroup(studentId: number, testGroupId: number) {
  const group = await prisma.testGroup.findUnique({
    where: { id: testGroupId },
    include: {
      questions: {
        include: {
          question: true,
        },
      },
    },
  });

  if (!group || !group.is_active) {
    throw new AppError('Test group not found or inactive.', 404);
  }

  if (group.questions.length === 0) {
    throw new AppError('This test group has no questions.', 400);
  }

  // Check subscription for paid groups
  if (group.is_paid) {
    const subscribed = await hasActiveSubscription(studentId, group.class_level);
    if (!subscribed) {
      throw new AppError(
        'This test requires an active subscription. Please subscribe to access paid tests.',
        403
      );
    }
  }

  const questions = group.questions.map(tgq => tgq.question);

  // Shuffle question order
  const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);

  const snapshots:         TestQuestionSnapshot[] = [];
  const frontendQuestions: FrontendQuestion[]     = [];

  for (const q of shuffledQuestions) {
    const { snapshot, frontend } = processQuestionForTest(
      q.id,
      q.content as unknown as QuestionContent,
      q.correct_option
    );
    snapshots.push(snapshot);
    frontendQuestions.push(frontend);
  }

  const test = await prisma.test.create({
    data: {
      student_id:     studentId,
      class_level:    group.class_level,
      subject:        group.subject,
      chapter:        group.chapter,
      test_type:      'ACTUAL',
      difficulty:     'MIXED',
      is_free_tier:   !group.is_paid,
      test_questions: snapshots as any,
      test_group_id:  group.id,
      time_limit:     group.time_limit,
    },
  });

  return {
    test_id:         test.id,
    test_type:       'ACTUAL',
    difficulty:      'MIXED',
    is_free_tier:    !group.is_paid,
    total_questions: frontendQuestions.length,
    time_limit:      group.time_limit,
    group_name:      group.name,
    group_type:      group.group_type,
    questions:       frontendQuestions,
  };
}

// ─── Auto-submit expired tests (server-side timeout) ──────────────────────────
export async function autoSubmitExpiredTests() {
  const now = new Date();

  // Find all IN_PROGRESS tests that have exceeded their time_limit
  const expiredTests = await prisma.test.findMany({
    where: {
      status: 'IN_PROGRESS',
      time_limit: { not: null },
    },
  });

  let autoSubmitted = 0;

  for (const test of expiredTests) {
    const startedAt = test.started_at;
    const elapsed = (now.getTime() - startedAt.getTime()) / 1000;

    if (elapsed > (test.time_limit! + 30)) { // 30s grace period
      const snapshots = test.test_questions as unknown as TestQuestionSnapshot[];
      const answers = (test.answers as unknown as SubmitAnswerItem[]) || [];
      const answerMap = new Map<number, number>();
      for (const a of answers) answerMap.set(a.question_id, a.selected_option);

      let correct = 0, incorrect = 0;
      for (const snap of snapshots) {
        const selected = answerMap.get(snap.question_id);
        if (selected !== undefined) {
          if (selected === snap.correct_option) correct++;
          else incorrect++;
        }
      }

      const total = snapshots.length;
      const attempted = correct + incorrect;
      const accuracy = attempted > 0 ? Math.round((correct / attempted) * 10000) / 100 : 0;

      await prisma.test.update({
        where: { id: test.id },
        data: {
          status:          'SUBMITTED',
          score:           correct,
          correct_count:   correct,
          incorrect_count: incorrect,
          accuracy,
          submitted_at:    now,
        },
      });

      autoSubmitted++;
    }
  }

  return { autoSubmitted };
}

// ─── Beacon-style submit (lightweight for navigator.sendBeacon) ───────────────
export async function submitTestBeacon(testId: number, answers: SubmitAnswerItem[]) {
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test || test.status === 'SUBMITTED') return;

  const snapshots = test.test_questions as unknown as TestQuestionSnapshot[];
  const answerMap = new Map<number, number>();
  for (const a of answers) answerMap.set(a.question_id, a.selected_option);

  let correct = 0, incorrect = 0;
  for (const snap of snapshots) {
    const selected = answerMap.get(snap.question_id);
    if (selected !== undefined) {
      if (selected === snap.correct_option) correct++;
      else incorrect++;
    }
  }

  const attempted = correct + incorrect;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 10000) / 100 : 0;

  await prisma.test.update({
    where: { id: testId },
    data: {
      status:          'SUBMITTED',
      answers:         answers as any,
      score:           correct,
      correct_count:   correct,
      incorrect_count: incorrect,
      accuracy,
      submitted_at:    new Date(),
    },
  });
}