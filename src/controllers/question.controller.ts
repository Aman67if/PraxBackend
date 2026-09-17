import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/AppError";
import * as questionService from "../services/question.service";
import { Difficulty, QuestionStatus } from "@prisma/client";

export const createQuestion = catchAsync(
  async (req: Request, res: Response) => {
    const question = await questionService.createQuestion({
      ...req.body,
      created_by: req.user!.userId,
    });
    res.status(201).json({ status: "success", data: question });
  },
);

export const getQuestions = catchAsync(async (req: Request, res: Response) => {
  const filter = {
    class_level: req.query.class_level
      ? parseInt(req.query.class_level as string)
      : undefined,
    subject: req.query.subject as string | undefined,
    chapter: req.query.chapter as string | undefined,
    topic: req.query.topic as string | undefined,
    difficulty: req.query.difficulty as Difficulty | undefined,
    status: req.query.status as QuestionStatus | undefined,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
  };
  const result = await questionService.getQuestions(filter, req.user!.role);
  res.status(200).json({ status: "success", ...result });
});

export const getQuestionById = catchAsync(
  async (req: Request, res: Response) => {
    const question = await questionService.getQuestionById(
      parseInt(req.params.id),
    );
    res.status(200).json({ status: "success", data: question });
  },
);

export const updateQuestion = catchAsync(
  async (req: Request, res: Response) => {
    const question = await questionService.updateQuestion(
      parseInt(req.params.id),
      req.body,
    );
    res.status(200).json({ status: "success", data: question });
  },
);

export const deleteQuestion = catchAsync(
  async (req: Request, res: Response) => {
    await questionService.deleteQuestion(parseInt(req.params.id));
    res.status(204).json({ status: "success", data: null });
  },
);

// ─── Search questions (admin: all, employee: own) ─────────────────────────────
export const searchQuestions = catchAsync(
  async (req: Request, res: Response) => {
    const isAdmin = req.user!.role === "ADMIN";
    const questionId = req.query.id ? parseInt(req.query.id as string) : undefined;

    // Search by question ID
    if (questionId) {
      const question = await questionService.searchQuestionById(
        questionId,
        req.user!.userId,
        isAdmin
      );
      return res.status(200).json({ status: "success", data: question });
    }

    // Search by filters
    const filter = {
      class_level: req.query.class_level
        ? parseInt(req.query.class_level as string)
        : undefined,
      subject: req.query.subject as string | undefined,
      chapter: req.query.chapter as string | undefined,
      topic: req.query.topic as string | undefined,
      difficulty: req.query.difficulty as Difficulty | undefined,
      month: req.query.month ? parseInt(req.query.month as string) : undefined,
      year: req.query.year ? parseInt(req.query.year as string) : undefined,
      employee_id: req.query.employee_id
        ? parseInt(req.query.employee_id as string)
        : undefined,
      status: req.query.status as QuestionStatus | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    };

    if (isAdmin) {
      const result = await questionService.searchQuestionsByFilters(filter);
      return res.status(200).json({ status: "success", ...result });
    }

    // Employee: scoped to own questions
    const result = await questionService.searchQuestionsByEmployee(
      req.user!.userId,
      filter
    );
    res.status(200).json({ status: "success", ...result });
  },
);

// ─── Update question status (admin only) ──────────────────────────────────────
export const updateQuestionStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { status, admin_note } = req.body;
    if (!status || !["APPROVED", "REJECTED", "CORRECTION"].includes(status)) {
      return res.status(400).json({
        status: "fail",
        message: "Status must be APPROVED, REJECTED, or CORRECTION",
      });
    }

    const question = await questionService.updateQuestionStatus(
      parseInt(req.params.id),
      status as QuestionStatus,
      req.user!.userId,
      admin_note
    );
    res.status(200).json({ status: "success", data: question });
  },
);

// ─── Employee: get CORRECTION questions ───────────────────────────────────────
export const getMyCorrections = catchAsync(
  async (req: Request, res: Response) => {
    const filter = {
      class_level: req.query.class_level
        ? parseInt(req.query.class_level as string)
        : undefined,
      subject: req.query.subject as string | undefined,
      chapter: req.query.chapter as string | undefined,
      topic: req.query.topic as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };
    const result = await questionService.getEmployeePendingCorrections(
      req.user!.userId,
      filter
    );
    res.status(200).json({ status: "success", ...result });
  },
);

// ─── Employee: get REJECTED questions ─────────────────────────────────────────
export const getMyRejections = catchAsync(
  async (req: Request, res: Response) => {
    const filter = {
      class_level: req.query.class_level
        ? parseInt(req.query.class_level as string)
        : undefined,
      subject: req.query.subject as string | undefined,
      chapter: req.query.chapter as string | undefined,
      topic: req.query.topic as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };
    const result = await questionService.getEmployeeRejectedQuestions(
      req.user!.userId,
      filter
    );
    res.status(200).json({ status: "success", ...result });
  },
);

// ─── Employee: edit own question (resets to PENDING) ──────────────────────────
export const editMyQuestion = catchAsync(
  async (req: Request, res: Response) => {
    const question = await questionService.updateQuestionByEmployee(
      parseInt(req.params.id),
      req.user!.userId,
      req.body
    );
    res.status(200).json({ status: "success", data: question });
  },
);

// ─── Admin: get all entered questions ─────────────────────────────────────────
export const getAllEnteredQuestions = catchAsync(
  async (req: Request, res: Response) => {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const result = await questionService.getAllEnteredQuestions(page, limit);
    res.status(200).json({ status: "success", ...result });
  },
);

// ─── Get employees list (for admin filter dropdown) ───────────────────────────
export const getEmployeesList = catchAsync(
  async (req: Request, res: Response) => {
    const employees = await questionService.getEmployeesList();
    res.status(200).json({ status: "success", data: employees });
  },
);
