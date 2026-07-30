import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";
import {
  createContextRecord,
  searchContextRecords,
  updateContextRecord,
} from "./context.service.js";
import {
  isContextRecordKind,
  isContextRecordStatus,
  isContextTopic,
  normalizeContextContent,
  normalizeContextDate,
  normalizeContextEntities,
  normalizeContextSearch,
} from "./context.validation.js";
import {
  isMemorySensitivity,
  normalizeMemoryConfidence,
} from "../memories/memories.validation.js";

export const contextRouter = Router();

contextRouter.get(
  "/records",
  asyncHandler(async (request, response) => {
    const search = request.query.q === undefined
      ? undefined
      : normalizeContextSearch(request.query.q);
    const topic = request.query.topic;
    const status = request.query.status;
    if (
      (request.query.q !== undefined && !search) ||
      (topic !== undefined && !isContextTopic(topic)) ||
      (status !== undefined && !isContextRecordStatus(status))
    ) {
      response.status(400).json({ error: "Los filtros de contexto no son válidos." });
      return;
    }
    response.json({
      records: await searchContextRecords({
        userId: request.authUser!.id,
        search: search ?? undefined,
        topics: isContextTopic(topic) ? [topic] : undefined,
        statuses: isContextRecordStatus(status) ? [status] : undefined,
      }),
    });
  }),
);

contextRouter.post(
  "/records",
  asyncHandler(async (request, response) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const content = normalizeContextContent(body.content);
    const entities = normalizeContextEntities(body.entities ?? []);
    const occurredAt = normalizeContextDate(body.occurredAt);
    const dueAt = normalizeContextDate(body.dueAt);
    const sensitivity = body.sensitivity ?? "normal";
    const confidence = normalizeMemoryConfidence(body.confidence ?? 1);
    if (
      !isContextTopic(body.topic) ||
      !isContextRecordKind(body.kind) ||
      !content ||
      !entities ||
      occurredAt === undefined ||
      dueAt === undefined ||
      !isMemorySensitivity(sensitivity) ||
      confidence === null
    ) {
      response.status(400).json({ error: "El registro contextual no es válido." });
      return;
    }
    const result = await createContextRecord({
      userId: request.authUser!.id,
      topic: body.topic,
      kind: body.kind,
      content,
      entities,
      sensitivity,
      confidence,
      source: "manual",
      occurredAt,
      dueAt,
    });
    response.status(result.duplicate ? 200 : 201).json(result);
  }),
);

contextRouter.patch(
  "/records/:id",
  asyncHandler(async (request, response) => {
    const idParam = request.params.id;
    const id = Array.isArray(idParam) ? null : idParam;
    const body = (request.body ?? {}) as Record<string, unknown>;
    const content = body.content === undefined
      ? undefined
      : normalizeContextContent(body.content);
    const dueAt = body.dueAt === undefined
      ? undefined
      : normalizeContextDate(body.dueAt);
    const status = body.status;
    if (
      !id ||
      id.length > 100 ||
      (body.content !== undefined && !content) ||
      dueAt === undefined && body.dueAt !== undefined ||
      (status !== undefined && !isContextRecordStatus(status)) ||
      (content === undefined && dueAt === undefined && status === undefined)
    ) {
      response.status(400).json({ error: "La actualización no es válida." });
      return;
    }
    const record = await updateContextRecord({
      id,
      userId: request.authUser!.id,
      content: content ?? undefined,
      status: isContextRecordStatus(status) ? status : undefined,
      dueAt,
    });
    if (!record) {
      response.status(404).json({ error: "El registro ya no existe." });
      return;
    }
    response.json({ record });
  }),
);
