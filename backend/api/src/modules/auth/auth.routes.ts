import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "./auth.middleware.js";
import { authRateLimit } from "./auth.rate-limit.js";
import {
  createSessionForIdentity,
  EmailAlreadyRegisteredError,
  isValidExchangeSecret,
  loginWithCredentials,
  registerWithCredentials,
  revokeSession,
} from "./auth.service.js";
import {
  normalizeDisplayName,
  normalizeEmail,
  normalizePassword,
} from "./auth.utils.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimit,
  asyncHandler(async (request, response) => {
    const { email, displayName, password } = (request.body ?? {}) as Record<
      string,
      unknown
    >;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = normalizePassword(password);
    if (
      !normalizedEmail ||
      !normalizedPassword ||
      typeof displayName !== "string" ||
      displayName.trim().length < 2 ||
      displayName.trim().length > 100
    ) {
      response.status(400).json({
        error:
          "Revisa tu nombre, correo y contraseña. Usa de 8 a 128 caracteres, con letras y números.",
      });
      return;
    }

    try {
      const session = await registerWithCredentials({
        email: normalizedEmail,
        displayName: normalizeDisplayName(displayName, normalizedEmail),
        password: normalizedPassword,
      });
      response.status(201).json(session);
    } catch (error) {
      if (error instanceof EmailAlreadyRegisteredError) {
        response.status(409).json({
          error: "Ya existe una cuenta con ese correo.",
        });
        return;
      }
      throw error;
    }
  }),
);

authRouter.post(
  "/login",
  authRateLimit,
  asyncHandler(async (request, response) => {
    const { email, password } = (request.body ?? {}) as Record<
      string,
      unknown
    >;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = normalizePassword(password);
    if (!normalizedEmail || !normalizedPassword) {
      response.status(401).json({
        error: "El correo o la contraseña no son correctos.",
      });
      return;
    }

    const session = await loginWithCredentials({
      email: normalizedEmail,
      password: normalizedPassword,
    });
    if (!session) {
      response.status(401).json({
        error: "El correo o la contraseña no son correctos.",
      });
      return;
    }
    response.json(session);
  }),
);

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
