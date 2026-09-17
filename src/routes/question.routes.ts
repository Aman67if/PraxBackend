import { Router } from "express";
import * as questionController from "../controllers/question.controller";
import { protect, restrictTo } from "../middleware/auth";
import {
  createQuestionValidators,
  idParamValidator,
  validate,
} from "../middleware/validators";
import { Role } from "@prisma/client";

const router = Router();

// All routes require authentication
router.use(protect);

// ─── Search (admin: all, employee: own) — must be before /:id ─────────────────
router.get("/search", questionController.searchQuestions);

// ─── Employee: my corrections and rejections ──────────────────────────────────
router.get(
  "/my/corrections",
  restrictTo(Role.EMPLOYEE),
  questionController.getMyCorrections
);
router.get(
  "/my/rejections",
  restrictTo(Role.EMPLOYEE),
  questionController.getMyRejections
);

// ─── Admin: all entered questions + employees list ────────────────────────────
router.get(
  "/all-entries",
  restrictTo(Role.ADMIN),
  questionController.getAllEnteredQuestions
);
router.get(
  "/employees-list",
  restrictTo(Role.ADMIN),
  questionController.getEmployeesList
);

// ─── CRUD ─────────────────────────────────────────────────────────────────────
router
  .route("/")
  .get(questionController.getQuestions)
  .post(
    restrictTo(Role.EMPLOYEE, Role.ADMIN),
    createQuestionValidators,
    validate,
    questionController.createQuestion,
  );

router
  .route("/:id")
  .get(idParamValidator, validate, questionController.getQuestionById)
  .patch(
    restrictTo(Role.EMPLOYEE, Role.ADMIN),
    idParamValidator,
    validate,
    questionController.updateQuestion,
  )
  .delete(
    restrictTo(Role.ADMIN),
    idParamValidator,
    validate,
    questionController.deleteQuestion,
  );

// ─── Admin: update question status ────────────────────────────────────────────
router.patch(
  "/:id/status",
  restrictTo(Role.ADMIN),
  idParamValidator,
  validate,
  questionController.updateQuestionStatus
);

// ─── Employee: edit own question (resets to PENDING) ──────────────────────────
router.patch(
  "/:id/edit",
  restrictTo(Role.EMPLOYEE),
  idParamValidator,
  validate,
  questionController.editMyQuestion
);

export default router;
