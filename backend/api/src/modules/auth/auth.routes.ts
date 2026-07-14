import { Router } from "express";

import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { rateLimit } from "../../shared/middlewares/rate-limit.middleware.js";
import { authController } from "./auth.controller.js";
import { loginSchema, refreshSchema, registerSchema } from "./auth.schemas.js";

export const authRoutes = Router();
const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
authRoutes.get("/health", authController.health);
authRoutes.post(
  "/register",
  authRateLimit,
  validate({ body: registerSchema }),
  asyncHandler(authController.register),
);
authRoutes.post(
  "/login",
  authRateLimit,
  validate({ body: loginSchema }),
  asyncHandler(authController.login),
);
authRoutes.post(
  "/refresh",
  authRateLimit,
  validate({ body: refreshSchema }),
  asyncHandler(authController.refresh),
);
authRoutes.post(
  "/logout",
  validate({ body: refreshSchema }),
  asyncHandler(authController.logout),
);
authRoutes.post(
  "/logout-all",
  authMiddleware,
  asyncHandler(authController.logoutAll),
);
