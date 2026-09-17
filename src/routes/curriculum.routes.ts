import { Router } from 'express';
import * as curriculumController from '../controllers/curriculum.controller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Public curriculum routes (for dropdowns — all authenticated users)
router.use(protect);
router.get('/', curriculumController.getCurriculum);
router.get('/classes', curriculumController.getClasses);
router.get('/subjects', curriculumController.getSubjects);
router.get('/chapters', curriculumController.getChapters);
router.get('/topics', curriculumController.getTopics);

export default router;
