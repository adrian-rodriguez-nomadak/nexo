import type { Request, Response } from "express";

import { ok } from "../../shared/utils/api-response.js";
import { syncService } from "./sync.service.js";

export const syncController = {
  health(_req: Request, res: Response) { return ok(res, syncService.health()); },
  async push(req: Request, res: Response) { return ok(res, await syncService.push(req.body.batch_id, req.body.changes)); },
  async pull(req: Request, res: Response) { return ok(res, await syncService.pull(Number(req.query.cursor), Number(req.query.limit))); },
};
