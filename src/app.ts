import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes";
import questionRoutes from "./routes/question.routes";
import testRoutes from "./routes/test.routes";
import adminRoutes from "./routes/admin.routes";
import curriculumRoutes from "./routes/curriculum.routes";
import testGroupRoutes from "./routes/testGroup.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import paymentRoutes from "./routes/payment.routes";
import uploadRoutes from "./routes/upload.routes";

import { globalErrorHandler } from "./middleware/errorHandler";
import { AppError } from "./utils/AppError";
import logger from "./config/logger";

const app: Application = express();

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
    credentials: true, // allow cookies
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Too many requests, please try again later.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    status: "fail",
    message: "Too many attempts, please try again after 15 minutes.",
  },
});

app.use("/api", globalLimiter);
app.use("/api/auth", authLimiter);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: { write: (msg) => logger.info(msg.trim()) },
    }),
  );
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/curriculum", curriculumRoutes);
app.use("/api/test-groups", testGroupRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/upload", uploadRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.all("*", (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.originalUrl} not found.`, 404));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(globalErrorHandler);

export default app;
