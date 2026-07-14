import { Router } from "express";

import { validate } from "../../shared/middlewares/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { tasksController } from "./tasks.controller.js";
import {
  createTaskSchema,
  idParamsSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "./tasks.schemas.js";

export const tasksRoutes = Router();

tasksRoutes.get("/", asyncHandler(tasksController.list));
tasksRoutes.get("/health", tasksController.health);
tasksRoutes.post(
  "/",
  validate({ body: createTaskSchema }),
  asyncHandler(tasksController.create),
);
tasksRoutes.patch(
  "/:id/status",
  validate({ params: idParamsSchema, body: updateTaskStatusSchema }),
  asyncHandler(tasksController.updateStatus),
);
tasksRoutes.patch(
  "/:id",
  validate({ params: idParamsSchema, body: updateTaskSchema }),
  asyncHandler(tasksController.update),
);
tasksRoutes.delete(
  "/:id",
  validate({ params: idParamsSchema }),
  asyncHandler(tasksController.remove),
);
