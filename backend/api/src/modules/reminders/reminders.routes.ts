import { Router } from "express";

import { validate } from "../../shared/middlewares/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { remindersController } from "./reminders.controller.js";
import {
  createReminderSchema,
  idParamsSchema,
  updateReminderSchema,
  updateReminderStatusSchema,
} from "./reminders.schemas.js";

export const remindersRoutes = Router();

remindersRoutes.get("/", asyncHandler(remindersController.list));
remindersRoutes.get("/health", remindersController.health);
remindersRoutes.post(
  "/",
  validate({ body: createReminderSchema }),
  asyncHandler(remindersController.create),
);
remindersRoutes.patch(
  "/:id/status",
  validate({ params: idParamsSchema, body: updateReminderStatusSchema }),
  asyncHandler(remindersController.updateStatus),
);
remindersRoutes.patch(
  "/:id",
  validate({ params: idParamsSchema, body: updateReminderSchema }),
  asyncHandler(remindersController.update),
);
remindersRoutes.delete(
  "/:id",
  validate({ params: idParamsSchema }),
  asyncHandler(remindersController.remove),
);
