import { Router } from "express";

import { validate } from "../../shared/middlewares/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { financesController } from "./finances.controller.js";
import {
  createMovementSchema,
  createUpcomingPaymentSchema,
  idParamsSchema,
  listMovementsQuerySchema,
  updateUpcomingPaymentStatusSchema,
} from "./finances.schemas.js";

export const financesRoutes = Router();

financesRoutes.get("/", financesController.health);
financesRoutes.get("/health", financesController.health);
financesRoutes.get("/summary", asyncHandler(financesController.summary));
financesRoutes.get(
  "/movements",
  validate({ query: listMovementsQuerySchema }),
  asyncHandler(financesController.listMovements),
);
financesRoutes.post(
  "/movements",
  validate({ body: createMovementSchema }),
  asyncHandler(financesController.createMovement),
);
financesRoutes.get(
  "/upcoming-payments",
  asyncHandler(financesController.listUpcomingPayments),
);
financesRoutes.post(
  "/upcoming-payments",
  validate({ body: createUpcomingPaymentSchema }),
  asyncHandler(financesController.createUpcomingPayment),
);
financesRoutes.patch(
  "/upcoming-payments/:id/status",
  validate({ params: idParamsSchema, body: updateUpcomingPaymentStatusSchema }),
  asyncHandler(financesController.updateUpcomingPaymentStatus),
);
