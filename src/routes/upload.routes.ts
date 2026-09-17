import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth';
import { uploadToS3 } from '../config/s3';
import { AppError } from '../utils/AppError';
import prisma from '../config/prisma';
import path from 'path';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  },
});

// ─── Upload profile image ─────────────────────────────────────────────────────
router.post(
  '/profile-image',
  protect,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) return next(new AppError('No file uploaded.', 400));

      const userId = req.user!.userId;
      const ext = path.extname(req.file.originalname);
      const key = `profile-images/${userId}_${Date.now()}${ext}`;

      const url = await uploadToS3(req.file.buffer, key, req.file.mimetype);

      await prisma.user.update({
        where: { id: userId },
        data: { profile_image: url },
      });

      res.json({ status: 'success', data: { url } });
    } catch (err) { next(err); }
  }
);

// ─── Upload generic image (for questions) ─────────────────────────────────────
router.post(
  '/image',
  protect,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) return next(new AppError('No file uploaded.', 400));

      const ext = path.extname(req.file.originalname);
      const key = `question-images/${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;

      const url = await uploadToS3(req.file.buffer, key, req.file.mimetype);

      res.json({ status: 'success', url });
    } catch (err) { next(err); }
  }
);

export default router;
