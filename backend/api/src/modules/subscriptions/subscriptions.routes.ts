import { Router } from "express";

import { validate } from "../../shared/middlewares/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { subscriptionsController } from "./subscriptions.controller.js";
import {
  createSubscriptionSchema,
  idParamsSchema,
  updateSubscriptionSchema,
  updateSubscriptionStatusSchema,
} from "./subscriptions.schemas.js";

export const subscriptionsRoutes = Router();

subscriptionsRoutes.get("/", asyncHandler(subscriptionsController.list));
subscriptionsRoutes.get("/health", subscriptionsController.health);
subscriptionsRoutes.post(
  "/",
  validate({ body: createSubscriptionSchema }),
  asyncHandler(subscriptionsController.create),
);
subscriptionsRoutes.patch(
  "/:id/status",
  validate({ params: idParamsSchema, body: updateSubscriptionStatusSchema }),
  asyncHandler(subscriptionsController.updateStatus),
);
subscriptionsRoutes.patch(
  "/:id",
  validate({ params: idParamsSchema, body: updateSubscriptionSchema }),
  asyncHandler(subscriptionsController.update),
);
subscriptionsRoutes.delete(
  "/:id",
  validate({ params: idParamsSchema }),
  asyncHandler(subscriptionsController.remove),
);
