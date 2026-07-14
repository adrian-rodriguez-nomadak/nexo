import type { NextFunction, Request, Response } from "express";
import { BaseError, ValidationError } from "sequelize";
import { ZodError } from "zod";

import { fail } from "../utils/api-response.js";

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    return fail(res, "Validation error", 400, error.flatten());
  }

  if (error instanceof ValidationError) {
    return fail(
      res,
      "Database validation error",
      400,
      error.errors.map((issue) => ({
        field: issue.path,
        message: issue.message,
      })),
    );
  }

  if (error instanceof BaseError) {
    return fail(res, "Database error", 500);
  }

  console.error(error);
  return fail(res, "Internal server error", 500);
}
