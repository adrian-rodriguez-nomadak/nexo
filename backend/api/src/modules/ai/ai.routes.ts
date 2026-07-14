import { Router } from "express";

import { aiController } from "./ai.controller.js";

export const aiRoutes = Router();

aiRoutes.get("/", aiController.health);
aiRoutes.get("/health", aiController.health);
