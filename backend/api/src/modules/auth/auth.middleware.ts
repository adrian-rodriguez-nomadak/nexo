import type { RequestHandler } from "express";

import { findUserBySessionToken } from "./auth.service.js";

export const requireAuth: RequestHandler = async (request, response, next) => {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    response.status(401).json({ error: "Inicia sesión para continuar." });
    return;
  }

  try {
    const user = await findUserBySessionToken(token);
    if (!user) {
      response.status(401).json({ error: "La sesión ya no es válida." });
      return;
    }

    request.authUser = user;
    request.authToken = token;
    next();
  } catch (error) {
    next(error);
  }
};
