import { Router } from "express";

import { validate } from "../../shared/middlewares/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { calendarController } from "./calendar.controller.js";
import {
  createCalendarEventSchema,
  idParamsSchema,
  listEventsQuerySchema,
  updateCalendarEventSchema,
  updateCalendarEventStatusSchema,
} from "./calendar.schemas.js";

export const calendarRoutes = Router();

calendarRoutes.get("/", calendarController.health);
calendarRoutes.get("/health", calendarController.health);
calendarRoutes.get(
  "/events",
  validate({ query: listEventsQuerySchema }),
  asyncHandler(calendarController.list),
);
calendarRoutes.post(
  "/events",
  validate({ body: createCalendarEventSchema }),
  asyncHandler(calendarController.create),
);
calendarRoutes.patch(
  "/events/:id/status",
  validate({ params: idParamsSchema, body: updateCalendarEventStatusSchema }),
  asyncHandler(calendarController.updateStatus),
);
calendarRoutes.patch(
  "/events/:id",
  validate({ params: idParamsSchema, body: updateCalendarEventSchema }),
  asyncHandler(calendarController.update),
);
calendarRoutes.delete(
  "/events/:id",
  validate({ params: idParamsSchema }),
  asyncHandler(calendarController.remove),
);
