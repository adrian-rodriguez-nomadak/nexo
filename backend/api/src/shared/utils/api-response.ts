import type { Response } from "express";

export function ok<T>(res: Response, data: T, message?: string) {
  return res.status(200).json({
    ok: true,
    data,
    ...(message ? { message } : {}),
  });
}

export function created<T>(res: Response, data: T, message?: string) {
  return res.status(201).json({
    ok: true,
    data,
    ...(message ? { message } : {}),
  });
}

export function fail(
  res: Response,
  message: string,
  status = 400,
  errors?: unknown,
) {
  return res.status(status).json({
    ok: false,
    message,
    ...(errors ? { errors } : {}),
  });
}

export function moduleHealth(moduleName: string) {
  return { module: moduleName, status: "active" };
}
