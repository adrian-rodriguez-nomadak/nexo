import { AsyncLocalStorage } from "node:async_hooks";
import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

const userContext = new AsyncLocalStorage<{ userId: string }>();

export function withUserContext(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (!req.user) throw new Error("Authenticated user context is missing");
  userContext.run({ userId: req.user.id }, next);
}

export function requireUserId() {
  const context = userContext.getStore();
  if (!context) throw new Error("Authenticated user context is missing");
  return context.userId;
}
