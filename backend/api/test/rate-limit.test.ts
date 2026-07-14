import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";

import { rateLimit } from "../src/shared/middlewares/rate-limit.middleware.js";

test("rate limiter rejects requests above the configured maximum", () => {
  const middleware = rateLimit({ windowMs: 60_000, max: 2 });
  const headers = new Map<string, string | number>();
  let statusCode = 200;
  let responseBody: unknown;
  let nextCalls = 0;
  const request = {
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" },
  } as Request;
  const response = {
    setHeader: (name: string, value: string | number) => headers.set(name, value),
    status: (value: number) => {
      statusCode = value;
      return response;
    },
    json: (value: unknown) => {
      responseBody = value;
      return response;
    },
  } as unknown as Response;
  const next = (() => {
    nextCalls += 1;
  }) as NextFunction;

  middleware(request, response, next);
  middleware(request, response, next);
  middleware(request, response, next);

  assert.equal(nextCalls, 2);
  assert.equal(statusCode, 429);
  assert.deepEqual(responseBody, {
    ok: false,
    message: "Too many requests. Try again later.",
  });
  assert.equal(headers.get("RateLimit-Remaining"), 0);
});
