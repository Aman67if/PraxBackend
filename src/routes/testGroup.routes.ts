import { Router } from 'express';
import * as testGroupController from '../controllers/testGroup.controller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(protect);

// Student routes
router.get('/', testGroupController.getTestGroups);
router.get('/:id', testGroupController.getTestGroupById);

export default router;
