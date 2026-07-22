import { Router } from "express";

import { usersController } from "./users.controller.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { updateProfileSchema } from "./users.schemas.js";

export const usersRoutes = Router();

usersRoutes.get("/", usersController.health);
usersRoutes.get("/health", usersController.health);
usersRoutes.get("/me", asyncHandler(usersController.me));
usersRoutes.put(
  "/me/profile",
  validate({ body: updateProfileSchema }),
  asyncHandler(usersController.updateProfile),
);
