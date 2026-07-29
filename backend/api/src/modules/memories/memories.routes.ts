import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";
import {
  listMemories,
  remember,
  reviewMemory,
} from "./memories.service.js";
import {
  isMemoryKind,
  isMemorySensitivity,
  isMemorySource,
  isMemoryStatus,
  normalizeMemoryConfidence,
  normalizeMemoryContent,
  normalizeMemoryModule,
  normalizeSourceRecordIds,
} from "./memories.validation.js";

export const memoriesRouter = Router();

memoriesRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const kind = typeof request.query.kind === "string" ? request.query.kind : null;
    const source =
      typeof request.query.source === "string" ? request.query.source : null;
    const status =
      typeof request.query.status === "string" ? request.query.status : null;
    const confirmed =
      request.query.confirmed === "true"
        ? true
        : request.query.confirmed === "false"
          ? false
          : undefined;
    if (
      (kind !== null && !isMemoryKind(kind)) ||
      (source !== null && !isMemorySource(source)) ||
      (status !== null && !isMemoryStatus(status))
    ) {
      response.status(400).json({ error: "El filtro de memoria no es válido." });
      return;
    }
    response.json({
      memories: await listMemories(request.authUser!.id, {
        kind: kind ?? undefined,
        source: source ?? undefined,
        status: status ?? undefined,
        confirmed,
      }),
    });
  }),
);

memoriesRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const {
      content,
      kind,
      module,
      sensitivity,
      sourceRecordIds,
      confidence,
    } = (request.body ?? {}) as Record<string, unknown>;
    const normalizedContent = normalizeMemoryContent(content);
    const normalizedConfidence = normalizeMemoryConfidence(confidence ?? 1);
    const normalizedSourceIds = normalizeSourceRecordIds(sourceRecordIds ?? []);
    const normalizedSensitivity = sensitivity ?? "normal";
    if (
      !normalizedContent ||
      !isMemoryKind(kind) ||
      !isMemorySensitivity(normalizedSensitivity) ||
      normalizedConfidence === null ||
      !normalizedSourceIds
    ) {
      response.status(400).json({ error: "La memoria no es válida." });
      return;
    }
    const memory = await remember({
      userId: request.authUser!.id,
      content: normalizedContent,
      kind,
      module: normalizeMemoryModule(module),
      source: "manual",
      sourceRecordIds: normalizedSourceIds,
      confidence: normalizedConfidence,
      sensitivity: normalizedSensitivity,
      userConfirmed: true,
    });
    response.status(201).json({ memory });
  }),
);

memoriesRouter.patch(
  "/:id/review",
  asyncHandler(async (request, response) => {
    const idParam = request.params.id;
    const id = Array.isArray(idParam) ? null : idParam;
    const { accepted } = (request.body ?? {}) as Record<string, unknown>;
    if (!id || id.length > 100 || typeof accepted !== "boolean") {
      response.status(400).json({ error: "La revisión no es válida." });
      return;
    }
    const memory = await reviewMemory({
      id,
      userId: request.authUser!.id,
      accepted,
    });
    if (!memory) {
      response.status(404).json({ error: "La memoria ya no existe." });
      return;
    }
    response.json({ memory });
  }),
);
