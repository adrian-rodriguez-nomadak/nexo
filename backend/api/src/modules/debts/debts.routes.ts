import { Router } from "express";

import { validate } from "../../shared/middlewares/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { debtsController } from "./debts.controller.js";
import {
  createDebtPaymentSchema,
  createDebtSchema,
  idParamsSchema,
  updateDebtSchema,
} from "./debts.schemas.js";

export const debtsRoutes = Router();

debtsRoutes.get("/", asyncHandler(debtsController.list));
debtsRoutes.get("/health", debtsController.health);
debtsRoutes.post(
  "/",
  validate({ body: createDebtSchema }),
  asyncHandler(debtsController.create),
);
debtsRoutes.post(
  "/:id/payments",
  validate({ params: idParamsSchema, body: createDebtPaymentSchema }),
  asyncHandler(debtsController.addPayment),
);
debtsRoutes.patch(
  "/:id",
  validate({ params: idParamsSchema, body: updateDebtSchema }),
  asyncHandler(debtsController.update),
);
debtsRoutes.delete(
  "/:id",
  validate({ params: idParamsSchema }),
  asyncHandler(debtsController.remove),
);
