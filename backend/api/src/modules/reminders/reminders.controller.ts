import type { Request, Response } from "express";

import { created, fail, ok } from "../../shared/utils/api-response.js";
import { remindersService } from "./reminders.service.js";

export const remindersController = {
  health(_req: Request, res: Response) {
    return ok(res, remindersService.health());
  },

  async list(_req: Request, res: Response) {
    return ok(res, await remindersService.list());
  },

  async create(req: Request, res: Response) {
    return created(res, await remindersService.create(req.body));
  },

  async update(req: Request, res: Response) {
    const reminder = await remindersService.update(req.params.id, req.body);
    if (!reminder) return fail(res, "Reminder not found", 404);
    return ok(res, reminder);
  },

  async updateStatus(req: Request, res: Response) {
    const reminder = await remindersService.updateStatus(
      req.params.id,
      req.body.status,
    );
    if (!reminder) return fail(res, "Reminder not found", 404);
    return ok(res, reminder);
  },

  async remove(req: Request, res: Response) {
    const removed = await remindersService.remove(req.params.id);
    if (!removed) return fail(res, "Reminder not found", 404);
    return ok(res, { id: req.params.id });
  },
};
