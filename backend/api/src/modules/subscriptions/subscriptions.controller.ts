import type { Request, Response } from "express";

import { created, fail, ok } from "../../shared/utils/api-response.js";
import { subscriptionsService } from "./subscriptions.service.js";

export const subscriptionsController = {
  health(_req: Request, res: Response) {
    return ok(res, subscriptionsService.health());
  },

  async list(_req: Request, res: Response) {
    return ok(res, await subscriptionsService.list());
  },

  async create(req: Request, res: Response) {
    return created(res, await subscriptionsService.create(req.body));
  },

  async update(req: Request, res: Response) {
    const subscription = await subscriptionsService.update(
      req.params.id,
      req.body,
    );
    if (!subscription) return fail(res, "Subscription not found", 404);
    return ok(res, subscription);
  },

  async updateStatus(req: Request, res: Response) {
    const subscription = await subscriptionsService.updateStatus(
      req.params.id,
      req.body.status,
    );
    if (!subscription) return fail(res, "Subscription not found", 404);
    return ok(res, subscription);
  },

  async remove(req: Request, res: Response) {
    const removed = await subscriptionsService.remove(req.params.id);
    if (!removed) return fail(res, "Subscription not found", 404);
    return ok(res, { id: req.params.id });
  },
};
