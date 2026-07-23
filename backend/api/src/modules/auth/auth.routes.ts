import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "./auth.middleware.js";
import {
  createSessionForIdentity,
  isValidExchangeSecret,
  revokeSession,
} from "./auth.service.js";
import { normalizeDisplayName, normalizeEmail } from "./auth.utils.js";

export const authRouter = Router();

authRouter.post(
  "/siwc",
  asyncHandler(async (request, response) => {
    if (!isValidExchangeSecret(request.header("x-nexo-auth-secret"))) {
      response.status(403).json({ error: "Intercambio de identidad no autorizado." });
      return;
    }

    const { email, displayName } = (request.body ?? {}) as Record<
      string,
      unknown
    >;
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      response.status(400).json({ error: "La identidad no es válida." });
      return;
    }

    const session = await createSessionForIdentity({
      email: normalizedEmail,
      displayName: normalizeDisplayName(displayName, normalizedEmail),
    });
    response.status(201).json(session);
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (request, response) => {
    response.json({ user: request.authUser });
  }),
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (request, response) => {
    await revokeSession(request.authToken!);
    response.status(204).end();
  }),
);
