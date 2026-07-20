import type { Request, Response } from "express";

import { fail, ok } from "../../shared/utils/api-response.js";
import { requireUserId } from "../../shared/auth/user-context.js";
import { aiService } from "./ai.service.js";

export const aiController = {
  health(_req: Request, res: Response) {
    return ok(res, aiService.health());
  },

  async analyzeMemory(req: Request, res: Response) {
    return analyzeMemoryRequest(req, res, requireUserId());
  },

  async analyzeMemoryPublic(req: Request, res: Response) {
    const installationId = req.header("x-nexo-installation-id")?.trim();
    const safeInstallationId =
      installationId && /^[a-zA-Z0-9-]{16,80}$/.test(installationId)
        ? installationId
        : `ip:${req.ip ?? "unknown"}`;
    return analyzeMemoryRequest(req, res, `prototype:${safeInstallationId}`);
  },
};

async function analyzeMemoryRequest(
  req: Request,
  res: Response,
  userId: string,
) {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (text.length < 3 || text.length > 12_000) {
    return fail(res, "El texto debe contener entre 3 y 12000 caracteres.");
  }
  const plan = req.body?.plan === "premium" ? "premium" : "free";
  const rawContext =
    typeof req.body?.memory_context === "object" &&
    req.body.memory_context !== null
      ? req.body.memory_context
      : {};
  const memoryContext = {
    compressedSummary:
      typeof rawContext.compressed_summary === "string"
        ? rawContext.compressed_summary.slice(0, 4000)
        : "",
    knownFacts: Array.isArray(rawContext.known_facts)
      ? rawContext.known_facts.map(String).slice(0, 50)
      : [],
    recurringPatterns: Array.isArray(rawContext.recurring_patterns)
      ? rawContext.recurring_patterns.map(String).slice(0, 20)
      : [],
  };
  const rawNotes: unknown[] = Array.isArray(req.body?.previous_notes)
    ? req.body.previous_notes.slice(0, 10)
    : [];
  const previousNotes = rawNotes
    .filter(
      (
        note,
      ): note is {
        id: string;
        text: string;
        tags?: unknown;
        summary?: unknown;
        details?: unknown;
      } =>
        typeof note === "object" &&
        note !== null &&
        "id" in note &&
        "text" in note &&
        typeof note.id === "string" &&
        typeof note.text === "string",
    )
    .map((note) => ({
      id: note.id,
      text: note.text.slice(0, 800),
      summary: typeof note.summary === "string" ? note.summary.slice(0, 500) : "",
      tags: Array.isArray(note.tags)
        ? note.tags.map(String).slice(0, 10)
        : [],
      details:
        typeof note.details === "object" && note.details !== null
          ? Object.fromEntries(
              Object.entries(note.details)
                .slice(0, 8)
                .map(([key, value]) => [
                  key.slice(0, 300),
                  String(value).slice(0, 500),
                ]),
            )
          : {},
    }));
  const analysis = await aiService.analyzeMemory({
    text,
    plan,
    memoryContext,
    previousNotes,
    userId,
  });
  if (!analysis) {
    return fail(res, "El análisis inteligente no está disponible.", 503);
  }
  return ok(res, analysis);
}
