import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

import { fail } from "../utils/api-response.js";

type ValidationSchemas = {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
};

export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    const bodyResult = schemas.body?.safeParse(req.body);
    if (bodyResult && !bodyResult.success) {
      return fail(res, "Validation error", 400, bodyResult.error.flatten());
    }
    if (bodyResult) req.body = bodyResult.data;

    const paramsResult = schemas.params?.safeParse(req.params);
    if (paramsResult && !paramsResult.success) {
      return fail(res, "Validation error", 400, paramsResult.error.flatten());
    }
    if (paramsResult) req.params = paramsResult.data;

    const queryResult = schemas.query?.safeParse(req.query);
    if (queryResult && !queryResult.success) {
      return fail(res, "Validation error", 400, queryResult.error.flatten());
    }
    if (queryResult) req.query = queryResult.data;

    return next();
  };
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}
