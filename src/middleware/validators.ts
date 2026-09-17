import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { AppError } from '../utils/AppError';

// ─── Run validation chains and collect errors ─────────────────────────────────
export function validate(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg).join('. ');
    return next(new AppError(messages, 422));
  }
  next();
}

// ─── Auth validators ──────────────────────────────────────────────────────────
export const registerValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('phone').optional().isMobilePhone('any').withMessage('Please provide a valid phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['STUDENT', 'EMPLOYEE', 'ADMIN']).withMessage('Invalid role'),
  body('class_level').optional().isInt({ min: 1, max: 12 }).withMessage('Class level must be between 1 and 12'),
  body().custom((_, { req }) => {
    if (!req.body.email && !req.body.phone) throw new Error('Either email or phone is required');
    return true;
  }),
];

export const loginValidators = [
  body('password').notEmpty().withMessage('Password is required'),
  body().custom((_, { req }) => {
    if (!req.body.email && !req.body.phone) throw new Error('Email or phone is required');
    return true;
  }),
];

// ─── Question validators ──────────────────────────────────────────────────────
export const createQuestionValidators = [
  body('class_level').isInt({ min: 1, max: 12 }).withMessage('class_level must be 1–12'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('chapter').trim().notEmpty().withMessage('Chapter is required'),
  body('topic').trim().notEmpty().withMessage('Topic is required'),
  body('difficulty').optional().isIn(['EASY', 'MEDIUM', 'HARD', 'MIXED']).withMessage('Invalid difficulty'),
  body('correct_option').isInt({ min: 0, max: 3 }).withMessage('correct_option must be 0–3'),
  body('content').isObject().withMessage('content must be an object'),
  body('content.question').isObject().withMessage('content.question is required'),
  body('content.question.text').notEmpty().withMessage('Question text is required'),
  body('content.options').isArray({ min: 4, max: 4 }).withMessage('Exactly 4 options required'),
  body('content.options.*.text').notEmpty().withMessage('Each option must have text'),
  body('content.explanation').isObject().withMessage('content.explanation is required'),
  body('content.explanation.text').notEmpty().withMessage('Explanation text is required'),
];

// ─── Test validators ──────────────────────────────────────────────────────────
export const startTestValidators = [
  body('class_level')
    .isInt({ min: 1, max: 12 }).withMessage('class_level must be 1–12'),
  body('subject')
    .trim().notEmpty().withMessage('subject is required'),
  body('chapter')
    .optional().trim().notEmpty(),
  body('test_type')
    .isIn(['ACTUAL', 'WARMUP']).withMessage('test_type must be ACTUAL or WARMUP'),
  body('difficulty')
    .isIn(['EASY', 'MEDIUM', 'HARD', 'MIXED']).withMessage('difficulty must be EASY, MEDIUM, HARD, or MIXED'),
];

export const submitTestValidators = [
  body('test_id').isInt({ min: 1 }).withMessage('Valid test_id is required'),
  body('answers').isArray({ min: 1 }).withMessage('answers must be a non-empty array'),
  body('answers.*.question_id').isInt({ min: 1 }).withMessage('Valid question_id required'),
  body('answers.*.selected_option').isInt({ min: 0, max: 3 }).withMessage('selected_option must be 0–3'),
];

export const idParamValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid ID parameter'),
];