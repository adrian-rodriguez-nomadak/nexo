import type { Request, Response } from "express";

import { created, fail, ok } from "../../shared/utils/api-response.js";
import { debtsService } from "./debts.service.js";

export const debtsController = {
  health(_req: Request, res: Response) {
    return ok(res, debtsService.health());
  },

  async list(_req: Request, res: Response) {
    return ok(res, await debtsService.list());
  },

  async create(req: Request, res: Response) {
    return created(res, await debtsService.create(req.body));
  },

  async update(req: Request, res: Response) {
    const debt = await debtsService.update(req.params.id, req.body);
    if (!debt) return fail(res, "Debt not found", 404);
    return ok(res, debt);
  },

  async remove(req: Request, res: Response) {
    const removed = await debtsService.remove(req.params.id);
    if (!removed) return fail(res, "Debt not found", 404);
    return ok(res, { id: req.params.id });
  },

  async addPayment(req: Request, res: Response) {
    const result = await debtsService.addPayment(req.params.id, req.body);
    if (!result) return fail(res, "Debt not found", 404);
    return created(res, result);
  },
};
