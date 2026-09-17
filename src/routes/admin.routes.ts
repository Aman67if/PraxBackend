import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import * as testGroupController from '../controllers/testGroup.controller';
import * as curriculumController from '../controllers/curriculum.controller';
import * as planController from '../controllers/subscriptionPlan.controller';
import { protect, restrictTo } from '../middleware/auth';
import { validate } from '../middleware/validators';
import { body, param } from 'express-validator';
import { Role } from '@prisma/client';

const router = Router();

router.use(protect, restrictTo(Role.ADMIN));

// ─── Platform metrics ─────────────────────────────────────────────────────────
router.get('/metrics',          adminController.getPlatformMetrics);
router.get('/employee-metrics', adminController.getEmployeeMetrics);
router.get('/users',            adminController.listUsers);

// ─── Employee management ──────────────────────────────────────────────────────
router.post(
  '/employees',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('phone').optional().isMobilePhone('any').withMessage('Valid phone required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body().custom((_, { req }) => {
      if (!req.body.email && !req.body.phone) throw new Error('Either email or phone is required');
      return true;
    }),
  ],
  validate,
  adminController.createEmployee
);

router.patch(
  '/employees/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid employee ID'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('phone').optional().isMobilePhone('any').withMessage('Valid phone required'),
    body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  adminController.updateEmployee
);

router.delete(
  '/employees/:id',
  [param('id').isInt({ min: 1 }).withMessage('Invalid employee ID')],
  validate,
  adminController.deleteEmployee
);

router.patch(
  '/users/:id/toggle',
  [param('id').isInt({ min: 1 }).withMessage('Invalid user ID')],
  validate,
  adminController.toggleUserActive
);

// ─── Test Group management ────────────────────────────────────────────────────
router.post('/test-groups', testGroupController.createTestGroup);
router.get('/test-groups', testGroupController.getTestGroups);
router.get('/test-groups/:id', testGroupController.getTestGroupById);
router.delete('/test-groups/:id', testGroupController.deleteTestGroup);
router.get('/questions-for-group', testGroupController.getQuestionsForGroup);

// ─── Curriculum management ────────────────────────────────────────────────────
router.post('/curriculum', curriculumController.createCurriculumEntry);

// ─── Subscription Plan management ─────────────────────────────────────────────
router.post('/subscription-plans', planController.createPlan);
router.patch('/subscription-plans/:id', planController.updatePlan);
router.delete('/subscription-plans/:id', planController.deletePlan);
router.get('/subscription-plans', planController.listPlans);

export default router;