import { Request, Response, NextFunction } from 'express';
import * as planService from '../services/subscriptionPlan.service';

export async function createPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await planService.createPlan(req.body);
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function updatePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    const data = await planService.updatePlan(id, req.body);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function deletePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    await planService.deletePlan(id);
    res.json({ status: 'success', message: 'Plan deleted successfully' });
  } catch (err) { next(err); }
}

export async function listPlans(req: Request, res: Response, next: NextFunction) {
  try {
    const includeInactive = req.query.all === 'true';
    const data = await planService.listPlans(includeInactive);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getStudentPlans(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await planService.getStudentPlans();
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function subscribeToPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await planService.subscribeToPlan(req.user!.userId, req.body.plan_id);
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getMySubscriptions(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await planService.getStudentSubscriptions(req.user!.userId);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}
