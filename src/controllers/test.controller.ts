import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/AppError";
import * as testService from "../services/test.service";

export const startTest = catchAsync(async (req: Request, res: Response) => {
  const result = await testService.startTest({
    student_id: req.user!.userId,
    class_level: req.body.class_level,
    subject: req.body.subject,
    chapter: req.body.chapter,
    test_type: req.body.test_type,
    difficulty: req.body.difficulty,
  });
  res.status(201).json({ status: "success", data: result });
});

export const submitTest = catchAsync(async (req: Request, res: Response) => {
  const result = await testService.submitTest(
    req.user!.userId,
    req.body.test_id,
    req.body.answers,
  );
  res.status(200).json({ status: "success", data: result });
});

export const getTestResult = catchAsync(async (req: Request, res: Response) => {
  const result = await testService.getTestResult(
    req.user!.userId,
    parseInt(req.params.id),
  );
  res.status(200).json({ status: "success", data: result });
});

export const getMyTests = catchAsync(async (req: Request, res: Response) => {
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
  const result = await testService.getStudentTests(
    req.user!.userId,
    page,
    limit,
  );
  res.status(200).json({ status: "success", ...result });
});

export const startTestFromGroup = catchAsync(async (req: Request, res: Response) => {
  const result = await testService.startTestFromGroup(
    req.user!.userId,
    req.body.test_group_id,
  );
  res.status(201).json({ status: "success", data: result });
});

export const submitTestBeacon = catchAsync(async (req: Request, res: Response) => {
  await testService.submitTestBeacon(req.body.test_id, req.body.answers || []);
  res.status(200).json({ status: "success" });
});

