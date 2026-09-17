import bcrypt from "bcryptjs";
import prisma from "../config/prisma";
import { AppError } from "../utils/AppError";
import { sendTokenCookie, clearTokenCookie } from "../utils/jwt";
import { Response } from "express";
import { Role } from "@prisma/client";

interface RegisterInput {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role?: Role;
  class_level?: number;
}

interface LoginInput {
  email?: string;
  phone?: string;
  password: string;
}

export async function registerUser(data: RegisterInput, res: Response) {
  if (data.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new AppError("Email already in use.", 409);
  }
  if (data.phone) {
    const existing = await prisma.user.findUnique({
      where: { phone: data.phone },
    });
    if (existing) throw new AppError("Phone number already in use.", 409);
  }

  const hashed = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: hashed,
      role: data.role || Role.STUDENT,
      class_level: data.class_level ?? null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      class_level: true,
      profile_image: true,
    },
  });

  const token = sendTokenCookie(res, { userId: user.id, role: user.role });
  return { user, token };
}

export async function loginUser(data: LoginInput, res: Response) {
  // Find user by email or phone (including inactive — so we can show the right error)
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(data.email ? [{ email: data.email }] : []),
        ...(data.phone ? [{ phone: data.phone }] : []),
      ],
    },
  });

  // Wrong credentials — intentionally vague for security
  if (!user || !(await bcrypt.compare(data.password, user.password))) {
    throw new AppError("Incorrect credentials.", 401);
  }

  // ── Account blocked check (role-specific message) ──
  if (!user.is_active) {
    if (user.role === Role.EMPLOYEE) {
      throw new AppError(
        "Your account has been blocked by the administrator. Please contact admin for assistance.",
        403,
      );
    }
    // Generic message for students or any other deactivated role
    throw new AppError(
      "Your account has been deactivated. Please contact support.",
      403,
    );
  }

  const token = sendTokenCookie(res, { userId: user.id, role: user.role });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      class_level: user.class_level,
      profile_image: user.profile_image,
    },
    token,
  };
}

export async function logoutUser(res: Response) {
  clearTokenCookie(res);
}

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      class_level: true,
      profile_image: true,
      created_at: true,
    },
  });
  if (!user) throw new AppError("User not found.", 404);
  return user;
}

export async function updateProfile(userId: number, data: { name?: string; phone?: string; class_level?: number; profile_image?: string }) {
  // If phone is provided, check if it's already in use by another user
  if (data.phone) {
    const existing = await prisma.user.findFirst({
      where: { phone: data.phone, id: { not: userId } },
    });
    if (existing) throw new AppError("Phone number already in use by another account.", 409);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      class_level: true,
      profile_image: true,
      created_at: true,
    },
  });
  return user;
}

export async function changePassword(userId: number, currentPassword?: string, newPassword?: string) {
  if (!newPassword) throw new AppError("New password is required.", 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found.", 404);

  if (user.password && currentPassword) {
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new AppError("Incorrect current password.", 400);
    }
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  return { message: "Password updated successfully" };
}
