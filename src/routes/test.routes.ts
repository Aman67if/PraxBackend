import { Router } from "express";
import * as testController from "../controllers/test.controller";
import { protect, restrictTo } from "../middleware/auth";
import {
  startTestValidators,
  submitTestValidators,
  idParamValidator,
  validate,
} from "../middleware/validators";
import { Role } from "@prisma/client";

const router = Router();

// All test routes require authentication
router.use(protect);

// Only students can start / submit tests
router.post(
  "/start",
  restrictTo(Role.STUDENT),
  startTestValidators,
  validate,
  testController.startTest,
);

router.post(
  "/submit",
  restrictTo(Role.STUDENT),
  submitTestValidators,
  validate,
  testController.submitTest,
);

router.get("/my", restrictTo(Role.STUDENT), testController.getMyTests);

// Start test from a test group
router.post(
  "/start-from-group",
  restrictTo(Role.STUDENT),
  testController.startTestFromGroup,
);

// Beacon-style submit (for auto-submit on browser close)
router.post(
  "/beacon-submit",
  restrictTo(Role.STUDENT),
  testController.submitTestBeacon,
);

// Results are accessible after submission
router.get(
  "/:id",
  restrictTo(Role.STUDENT),
  idParamValidator,
  validate,
  testController.getTestResult,
);

export default router;
