import type { Request, Response } from "express";

import { ok } from "../../shared/utils/api-response.js";
import { usersService } from "./users.service.js";

export const usersController = {
  health(_req: Request, res: Response) {
    return ok(res, usersService.health());
  },
};
