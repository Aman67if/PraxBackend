import { Role } from '@prisma/client';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface JwtPayload {
  userId: number;
  role:   Role;
}

// ─── Question Content ─────────────────────────────────────────────────────────
export interface ContentBlock {
  text:  string;
  image: string | null;
}

export interface QuestionContent {
  question:    ContentBlock;
  options:     ContentBlock[];
  explanation: ContentBlock;
}

export interface TrackedOption extends ContentBlock {
  originalIndex: number;
}

// ─── Test Snapshot ────────────────────────────────────────────────────────────
export interface TestQuestionSnapshot {
  question_id:      number;
  question_content: QuestionContent;
  shuffled_options: TrackedOption[];
  correct_option:   number;
}

export interface FrontendQuestion {
  question_id: number;
  question:    ContentBlock;
  options:     ContentBlock[];
}

// ─── API Request Bodies ───────────────────────────────────────────────────────
export type TestType  = 'ACTUAL' | 'WARMUP';
export type DiffInput = 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';

export interface StartTestBody {
  class_level: number;
  subject:     string;
  chapter?:    string;
  test_type:   TestType;   // ACTUAL or WARMUP
  difficulty:  DiffInput;  // EASY | MEDIUM | HARD | MIXED
}

export interface SubmitAnswerItem {
  question_id:     number;
  selected_option: number;
}

export interface SubmitTestBody {
  test_id: number;
  answers: SubmitAnswerItem[];
}

// ─── API Responses ────────────────────────────────────────────────────────────
export interface ResultBreakdownItem {
  question_id:     number;
  question:        ContentBlock;
  options:         ContentBlock[];
  selected_option: number | null;
  correct_option:  number;
  is_correct:      boolean;
  explanation:     ContentBlock;
}

export interface TestResultResponse {
  test_id:           number;
  test_type:         string;
  difficulty:        string;
  is_free_tier:      boolean;
  score:             number;
  correct_count:     number;
  incorrect_count:   number;
  unattempted_count: number;
  total_questions:   number;
  accuracy:          number;
  submitted_at:      Date;
  breakdown:         ResultBreakdownItem[];
}