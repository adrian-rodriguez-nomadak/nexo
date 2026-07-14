import { Router } from "express";

import { validate } from "../../shared/middlewares/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { syncController } from "./sync.controller.js";
import { syncPullSchema, syncPushSchema } from "./sync.schemas.js";

export const syncRoutes = Router();
syncRoutes.get("/health", syncController.health);
syncRoutes.post("/push", validate({ body: syncPushSchema }), asyncHandler(syncController.push));
syncRoutes.get("/pull", validate({ query: syncPullSchema }), asyncHandler(syncController.pull));
