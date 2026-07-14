import { Router } from "express";

import { usersController } from "./users.controller.js";

export const usersRoutes = Router();

usersRoutes.get("/", usersController.health);
usersRoutes.get("/health", usersController.health);
