import { Request, Response, NextFunction } from 'express';
import * as curriculumService from '../services/curriculum.service';

export async function getCurriculum(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await curriculumService.getCurriculum();
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getClasses(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await curriculumService.getClasses();
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getSubjects(req: Request, res: Response, next: NextFunction) {
  try {
    const classLevel = parseInt(req.query.class as string);
    if (isNaN(classLevel)) return res.status(400).json({ status: 'fail', message: 'class is required' });
    const data = await curriculumService.getSubjects(classLevel);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getChapters(req: Request, res: Response, next: NextFunction) {
  try {
    const classLevel = parseInt(req.query.class as string);
    const subject = req.query.subject as string;
    if (isNaN(classLevel) || !subject) return res.status(400).json({ status: 'fail', message: 'class and subject are required' });
    const data = await curriculumService.getChapters(classLevel, subject);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getTopics(req: Request, res: Response, next: NextFunction) {
  try {
    const classLevel = parseInt(req.query.class as string);
    const subject = req.query.subject as string;
    const chapter = req.query.chapter as string;
    if (isNaN(classLevel) || !subject || !chapter) return res.status(400).json({ status: 'fail', message: 'class, subject, and chapter are required' });
    const data = await curriculumService.getTopics(classLevel, subject, chapter);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function createCurriculumEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await curriculumService.createCurriculumEntry(req.body);
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
}
