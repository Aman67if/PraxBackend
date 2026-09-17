import { Router } from 'express';
import * as planController from '../controllers/subscriptionPlan.controller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(protect);

// Student routes
router.get('/plans', planController.getStudentPlans);
router.post('/subscribe', planController.subscribeToPlan);
router.get('/my-subscriptions', planController.getMySubscriptions);

export default router;
