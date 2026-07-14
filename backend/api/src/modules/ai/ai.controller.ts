import type { Request, Response } from "express";

import { ok } from "../../shared/utils/api-response.js";
import { aiService } from "./ai.service.js";

export const aiController = {
  health(_req: Request, res: Response) {
    return ok(res, aiService.health());
  },
};
