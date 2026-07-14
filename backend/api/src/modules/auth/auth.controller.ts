import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../shared/middlewares/auth.middleware.js";
import { created, fail, ok } from "../../shared/utils/api-response.js";
import { authService } from "./auth.service.js";

export const authController = {
  health(_req: Request, res: Response) { return ok(res, authService.health()); },
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    return result ? created(res, result) : fail(res, "Email is already registered", 409);
  },
  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    return result ? ok(res, result) : fail(res, "Invalid credentials", 401);
  },
  async refresh(req: Request, res: Response) {
    const result = await authService.refresh(req.body.refresh_token);
    return result ? ok(res, result) : fail(res, "Invalid refresh token", 401);
  },
  async logout(req: Request, res: Response) {
    await authService.logout(req.body.refresh_token);
    return ok(res, { logged_out: true });
  },
  async logoutAll(req: AuthenticatedRequest, res: Response) {
    await authService.logoutAll(req.user!.id);
    return ok(res, { logged_out: true });
  },
};
