import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/AppError";
import * as authService from "../services/auth.service";

export const register = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await authService.registerUser(req.body, res);
    res.status(201).json({
      status: "success",
      data: result,
    });
  },
);

export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, phone, password } = req.body;
    const result = await authService.loginUser({ email, phone, password }, res);
    res.status(200).json({
      status: "success",
      data: result,
    });
  },
);

export const logout = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await authService.logoutUser(res);
    res
      .status(200)
      .json({ status: "success", message: "Logged out successfully." });
  },
);

export const getMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await authService.getMe(req.user!.userId);
    res.status(200).json({ status: "success", data: user });
  },
);

export const updateProfile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, phone, class_level, profile_image } = req.body;
    const user = await authService.updateProfile(req.user!.userId, {
      name,
      phone,
      class_level,
      profile_image,
    });
    res.status(200).json({ status: "success", data: user });
  },
);

export const changePassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(
      req.user!.userId,
      currentPassword,
      newPassword
    );
    res.status(200).json({ status: "success", data: result });
  },
);
