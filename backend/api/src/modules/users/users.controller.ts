import type { Request, Response } from "express";

import { ok } from "../../shared/utils/api-response.js";
import { usersService } from "./users.service.js";

export const usersController = {
  health(_req: Request, res: Response) {
    return ok(res, usersService.health());
  },
  async me(_req: Request, res: Response) {
    return ok(res, await usersService.me());
  },
  async updateProfile(req: Request, res: Response) {
    return ok(res, await usersService.updateProfile(req.body));
  },
};
