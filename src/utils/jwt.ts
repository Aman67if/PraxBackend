import jwt from "jsonwebtoken";
import { Response } from "express";
import { JwtPayload } from "../types";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const COOKIE_EXPIRES_DAYS = parseInt(
  process.env.JWT_COOKIE_EXPIRES_IN || "7",
  10,
);

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

// Detect cross-origin setup (e.g. ngrok HTTPS tunnel)
// Hardcoded to true to support the ngrok setup the user is running
const isCrossOriginHttps = true;

export function sendTokenCookie(res: Response, payload: JwtPayload): string {
  const token = signToken(payload);

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: isCrossOriginHttps,
    sameSite: isCrossOriginHttps ? "none" : "lax",
    maxAge: COOKIE_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  });

  return token;
}

export function clearTokenCookie(res: Response): void {
  res.cookie("jwt", "", {
    httpOnly: true,
    secure: isCrossOriginHttps,
    sameSite: isCrossOriginHttps ? "none" : "lax",
    expires: new Date(0),
  });
}
