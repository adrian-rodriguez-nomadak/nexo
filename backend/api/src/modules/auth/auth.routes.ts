import { Router } from "express";

import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { authController } from "./auth.controller.js";
import { loginSchema, refreshSchema, registerSchema } from "./auth.schemas.js";

export const authRoutes = Router();
authRoutes.get("/health", authController.health);
authRoutes.post("/register", validate({ body: registerSchema }), asyncHandler(authController.register));
authRoutes.post("/login", validate({ body: loginSchema }), asyncHandler(authController.login));
authRoutes.post("/refresh", validate({ body: refreshSchema }), asyncHandler(authController.refresh));
authRoutes.post("/logout", validate({ body: refreshSchema }), asyncHandler(authController.logout));
authRoutes.post("/logout-all", authMiddleware, asyncHandler(authController.logoutAll));
