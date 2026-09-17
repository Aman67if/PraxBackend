import { Request, Response } from 'express';
import { catchAsync } from '../utils/AppError';
import * as adminService from '../services/admin.service';
import { Role } from '@prisma/client';

export const listUsers = catchAsync(async (req: Request, res: Response) => {
  const role = req.query.role as Role | undefined;
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
  const result = await adminService.listUsers(role, page, limit);
  res.status(200).json({ status: 'success', ...result });
});

export const createEmployee = catchAsync(async (req: Request, res: Response) => {
  const employee = await adminService.createEmployee(req.body);
  res.status(201).json({ status: 'success', data: employee });
});

export const updateEmployee = catchAsync(async (req: Request, res: Response) => {
  const employee = await adminService.updateEmployee(parseInt(req.params.id), req.body);
  res.status(200).json({ status: 'success', data: employee });
});

export const deleteEmployee = catchAsync(async (req: Request, res: Response) => {
  await adminService.deleteEmployee(parseInt(req.params.id));
  res.status(204).json({ status: 'success', data: null });
});

export const toggleUserActive = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.toggleUserActive(parseInt(req.params.id));
  res.status(200).json({ status: 'success', data: result });
});

export const getPlatformMetrics = catchAsync(async (req: Request, res: Response) => {
  const metrics = await adminService.getPlatformMetrics();
  res.status(200).json({ status: 'success', data: metrics });
});

export const getEmployeeMetrics = catchAsync(async (req: Request, res: Response) => {
  const data = await adminService.getEmployeeMetrics();
  res.status(200).json({ status: 'success', data });
});