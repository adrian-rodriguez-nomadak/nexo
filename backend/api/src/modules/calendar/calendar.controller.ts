import type { Request, Response } from "express";

import { created, fail, ok } from "../../shared/utils/api-response.js";
import { calendarService } from "./calendar.service.js";

export const calendarController = {
  health(_req: Request, res: Response) {
    return ok(res, calendarService.health());
  },

  async list(req: Request, res: Response) {
    return ok(res, await calendarService.list(req.query));
  },

  async create(req: Request, res: Response) {
    return created(res, await calendarService.create(req.body));
  },

  async update(req: Request, res: Response) {
    const event = await calendarService.update(req.params.id, req.body);
    if (!event) return fail(res, "Calendar event not found", 404);
    return ok(res, event);
  },

  async updateStatus(req: Request, res: Response) {
    const event = await calendarService.updateStatus(
      req.params.id,
      req.body.status,
    );
    if (!event) return fail(res, "Calendar event not found", 404);
    return ok(res, event);
  },

  async remove(req: Request, res: Response) {
    const removed = await calendarService.remove(req.params.id);
    if (!removed) return fail(res, "Calendar event not found", 404);
    return ok(res, { id: req.params.id });
  },
};
