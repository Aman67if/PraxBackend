import { Request, Response, NextFunction } from 'express';
import * as testGroupService from '../services/testGroup.service';
import { TestGroupType } from '@prisma/client';

export async function createTestGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await testGroupService.createTestGroup({
      ...req.body,
      created_by: req.user!.userId,
    });
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getTestGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const filter: any = {};
    if (req.query.class) filter.class_level = parseInt(req.query.class as string);
    if (req.query.subject) filter.subject = req.query.subject as string;
    if (req.query.topic) filter.topic = req.query.topic as string;
    if (req.query.group_type) filter.group_type = req.query.group_type as TestGroupType;
    if (req.query.is_active !== undefined) filter.is_active = req.query.is_active === 'true';

    const data = await testGroupService.getTestGroups(filter);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getTestGroupById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    const data = await testGroupService.getTestGroupById(id);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getQuestionsForGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const filter: any = {};
    if (req.query.class) filter.class_level = parseInt(req.query.class as string);
    if (req.query.subject) filter.subject = req.query.subject as string;
    if (req.query.chapter) filter.chapter = req.query.chapter as string;
    if (req.query.topic) filter.topic = req.query.topic as string;
    if (req.query.page) filter.page = parseInt(req.query.page as string);
    if (req.query.limit) filter.limit = parseInt(req.query.limit as string);

    const data = await testGroupService.getQuestionsForGroupSelection(filter);
    res.json({ status: 'success', ...data });
  } catch (err) { next(err); }
}

export async function deleteTestGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    const data = await testGroupService.deleteTestGroup(id);
    res.json({ status: 'success', ...data });
  } catch (err) { next(err); }
}
