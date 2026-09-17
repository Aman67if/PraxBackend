import {
  QuestionContent,
  TrackedOption,
  TestQuestionSnapshot,
  FrontendQuestion,
} from "../types";

/**
 * Fisher-Yates shuffle – mutates the array in place and returns it.
 */
function fisherYatesShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Shuffles the options of a question and updates the correct_option index
 * so it still points to the right answer after shuffling.
 *
 * Returns:
 *  - snapshot  → stored in DB (contains shuffled_options with correct_option)
 *  - frontend  → sent to the client (NO correct_option exposed)
 */
export function processQuestionForTest(
  questionId: number,
  content: QuestionContent,
  correctOption: number,
): { snapshot: TestQuestionSnapshot; frontend: FrontendQuestion } {
  // Tag each option with its original index before shuffling
  const tagged: TrackedOption[] = content.options.map((opt, idx) => ({
    ...opt,
    originalIndex: idx,
  }));

  // Shuffle in place
  fisherYatesShuffle(tagged);

  // Locate new position of the correct answer
  const newCorrectIndex = tagged.findIndex(
    (opt) => opt.originalIndex === correctOption,
  );

  // Build the snapshot (stored securely in DB)
  const snapshot: TestQuestionSnapshot = {
    question_id: questionId,
    question_content: {
      question: content.question,
      options: tagged.map(({ text, image }) => ({ text, image })),
      explanation: content.explanation,
    },
    shuffled_options: tagged,
    correct_option: newCorrectIndex,
  };

  // Build the safe payload for the frontend (no correct_option!)
  const frontend: FrontendQuestion = {
    question_id: questionId,
    question: content.question,
    options: tagged.map(({ text, image }) => ({ text, image })),
  };

  return { snapshot, frontend };
}
