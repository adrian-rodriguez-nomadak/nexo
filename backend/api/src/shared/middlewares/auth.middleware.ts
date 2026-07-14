import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";

export type AuthenticatedRequest = Request & {
  user?: { id: string };
};

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.header("authorization");
  const token = header?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
    if (payload.type !== "access" || typeof payload.sub !== "string") throw new Error("Invalid token");
    req.user = { id: payload.sub };
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
}
