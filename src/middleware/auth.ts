import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import prisma from "../config/prisma";
import { Role } from "@prisma/client";
import { JwtPayload } from "../types";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verifies the JWT from the HttpOnly cookie and attaches user to req.user.
 */
export async function protect(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Get token from cookie or Authorization header
    let token: string | undefined;

    if (req.cookies?.jwt) {
      token = req.cookies.jwt as string;
    } else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new AppError(
          "You are not logged in. Please log in to get access.",
          401,
        ),
      );
    }

    // 2. Verify token
    const decoded = verifyToken(token);

    // 3. Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, is_active: true },
    });

    if (!user || !user.is_active) {
      return next(
        new AppError("The user belonging to this token no longer exists.", 401),
      );
    }

    // 4. Attach to request
    req.user = { userId: user.id, role: user.role };
    next();
  } catch (err) {
    next(new AppError("Invalid or expired token. Please log in again.", 401));
  }
}

/**
 * Restrict access to specific roles.
 * Usage: restrictTo(Role.ADMIN, Role.EMPLOYEE)
 */
export function restrictTo(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action.", 403),
      );
    }
    next();
  };
}
