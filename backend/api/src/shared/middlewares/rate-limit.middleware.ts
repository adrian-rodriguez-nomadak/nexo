import type { NextFunction, Request, Response } from "express";

type RateLimitEntry = { count: number; resetAt: number };

export function rateLimit(options: { windowMs: number; max: number }) {
  const entries = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const current = entries.get(key);
    const entry =
      !current || current.resetAt <= now
        ? { count: 0, resetAt: now + options.windowMs }
        : current;

    entry.count += 1;
    entries.set(key, entry);
    res.setHeader("RateLimit-Limit", options.max);
    res.setHeader(
      "RateLimit-Remaining",
      Math.max(options.max - entry.count, 0),
    );
    res.setHeader("RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > options.max) {
      return res.status(429).json({
        ok: false,
        message: "Too many requests. Try again later.",
      });
    }

    if (entries.size > 10_000) {
      for (const [entryKey, value] of entries) {
        if (value.resetAt <= now) entries.delete(entryKey);
      }
    }
    return next();
  };
}
