import type { Request, Response } from "express";

import { created, fail, ok } from "../../shared/utils/api-response.js";
import { financesService } from "./finances.service.js";

export const financesController = {
  health(_req: Request, res: Response) {
    return ok(res, financesService.health());
  },

  async summary(_req: Request, res: Response) {
    return ok(res, await financesService.getSummary());
  },

  async listMovements(req: Request, res: Response) {
    return ok(res, await financesService.listMovements(req.query));
  },

  async createMovement(req: Request, res: Response) {
    return created(res, await financesService.createMovement(req.body));
  },

  async listUpcomingPayments(_req: Request, res: Response) {
    return ok(res, await financesService.listUpcomingPayments());
  },

  async createUpcomingPayment(req: Request, res: Response) {
    return created(res, await financesService.createUpcomingPayment(req.body));
  },

  async updateUpcomingPaymentStatus(req: Request, res: Response) {
    const payment = await financesService.updateUpcomingPaymentStatus(
      req.params.id,
      req.body.status,
    );
    if (!payment) return fail(res, "Upcoming payment not found", 404);
    return ok(res, payment);
  },
};
