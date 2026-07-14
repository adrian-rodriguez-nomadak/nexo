import type { Request, Response } from "express";

import { ok } from "../../shared/utils/api-response.js";
import { inboxService } from "./inbox.service.js";

export const inboxController = {
  health(_req: Request, res: Response) {
    return ok(res, inboxService.health());
  },

  async interpret(req: Request, res: Response) {
    return ok(res, await inboxService.interpret(req.body.text));
  },
};
