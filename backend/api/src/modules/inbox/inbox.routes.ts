import { Router } from "express";

import { validate } from "../../shared/middlewares/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { inboxController } from "./inbox.controller.js";
import { interpretInboxSchema } from "./inbox.schemas.js";

export const inboxRoutes = Router();

inboxRoutes.get("/", inboxController.health);
inboxRoutes.get("/health", inboxController.health);
inboxRoutes.post(
  "/interpret",
  validate({ body: interpretInboxSchema }),
  asyncHandler(inboxController.interpret),
);
