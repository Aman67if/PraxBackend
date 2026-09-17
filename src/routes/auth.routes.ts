import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { protect } from "../middleware/auth";
import {
  registerValidators,
  loginValidators,
  validate,
} from "../middleware/validators";

const router = Router();

router.post("/register", registerValidators, validate, authController.register);
router.post("/login", loginValidators, validate, authController.login);
router.post("/logout", protect, authController.logout);
router.get("/me", protect, authController.getMe);
router.patch("/update-profile", protect, authController.updateProfile);
router.patch("/change-password", protect, authController.changePassword);

export default router;
