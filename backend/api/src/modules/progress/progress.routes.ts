import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";
import { getProgress } from "./progress.service.js";
import { normalizeProgressDays } from "./progress.validation.js";

export const progressRouter = Router();

progressRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    response.json(
      await getProgress(
        request.authUser!.id,
        normalizeProgressDays(request.query.days),
      ),
    );
  }),
);
