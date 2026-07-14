import type { Request, Response } from "express";

import { created, fail, ok } from "../../shared/utils/api-response.js";
import { tasksService } from "./tasks.service.js";

export const tasksController = {
  health(_req: Request, res: Response) {
    return ok(res, tasksService.health());
  },

  async list(_req: Request, res: Response) {
    return ok(res, await tasksService.list());
  },

  async create(req: Request, res: Response) {
    return created(res, await tasksService.create(req.body));
  },

  async update(req: Request, res: Response) {
    const task = await tasksService.update(req.params.id, req.body);
    if (!task) return fail(res, "Task not found", 404);
    return ok(res, task);
  },

  async updateStatus(req: Request, res: Response) {
    const task = await tasksService.updateStatus(
      req.params.id,
      req.body.status,
    );
    if (!task) return fail(res, "Task not found", 404);
    return ok(res, task);
  },

  async remove(req: Request, res: Response) {
    const removed = await tasksService.remove(req.params.id);
    if (!removed) return fail(res, "Task not found", 404);
    return ok(res, { id: req.params.id });
  },
};
