import type { RequestHandler } from "express";

const WINDOW_MS = 15 * 60 * 1_000;
const MAX_ATTEMPTS = 12;

type Attempt = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, Attempt>();

export const authRateLimit: RequestHandler = (request, response, next) => {
  const now = Date.now();
  const key = request.ip ?? request.socket.remoteAddress ?? "unknown";
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (current.count >= MAX_ATTEMPTS) {
    response.setHeader(
      "Retry-After",
      Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
    );
    response.status(429).json({
      error: "Demasiados intentos. Espera unos minutos antes de continuar.",
    });
    return;
  }

  current.count += 1;
  next();
};
