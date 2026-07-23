import type { Request, Response } from "express";

import { fail, ok } from "../../shared/utils/api-response.js";
import { sportsService } from "./sports.service.js";

export const sportsController = {
  health(_req: Request, res: Response) {
    return ok(res, sportsService.health());
  },

  async overview(_req: Request, res: Response) {
    return ok(res, await sportsService.overview());
  },

  async match(req: Request, res: Response) {
    const context = await sportsService.context(req.params.id);
    if (!context) return fail(res, "Partido no encontrado", 404);
    return ok(res, context);
  },

  async analyzeMatch(req: Request, res: Response) {
    const result = await sportsService.analyze(req.params.id);
    if (!result) return fail(res, "Partido no encontrado", 404);
    return ok(res, result);
  },

  async extractTicket(req: Request, res: Response) {
    return ok(res, await sportsService.extractTicket(req.body.image_data_url));
  },

  async analyzeBet(req: Request, res: Response) {
    return ok(res, await sportsService.analyzeBet(req.body));
  },

  async history(req: Request, res: Response) {
    return ok(res, await sportsService.history(Number(req.query.limit)));
  },
};
