import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import logger from "../config/logger";

function handlePrismaError(err: any): AppError {
  // Unique constraint violation
  if (err.code === "P2002") {
    const field = err.meta?.target?.[0] || "field";
    return new AppError(`A record with this ${field} already exists.`, 409);
  }
  // Record not found
  if (err.code === "P2025") {
    return new AppError("Record not found.", 404);
  }
  return new AppError("Database error occurred.", 500);
}

function handleJWTError(): AppError {
  return new AppError("Invalid token. Please log in again.", 401);
}

function handleJWTExpiredError(): AppError {
  return new AppError("Your token has expired. Please log in again.", 401);
}

export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  let error = { ...err, message: err.message };

  // Prisma errors
  if (err.constructor.name === "PrismaClientKnownRequestError") {
    error = handlePrismaError(err);
  }
  // JWT errors
  if (err.name === "JsonWebTokenError") error = handleJWTError();
  if (err.name === "TokenExpiredError") error = handleJWTExpiredError();

  if (process.env.NODE_ENV === "development") {
    logger.error(err);
    return res.status(error.statusCode).json({
      status: error.status,
      error: err,
      message: error.message,
      stack: err.stack,
    });
  }

  // Production: only send operational errors to client
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
    });
  }

  // Programming or unknown error
  logger.error("UNEXPECTED ERROR:", err);
  return res.status(500).json({
    status: "error",
    message: "Something went wrong. Please try again later.",
  });
}
