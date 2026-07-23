import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";
import {
  createCapture,
  deleteCapture,
  listCaptures,
} from "./captures.service.js";
import {
  isModuleKey,
  normalizeCaptureContent,
} from "./captures.validation.js";

export const capturesRouter = Router();

capturesRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const requestedModule =
      typeof request.query.module === "string" ? request.query.module : null;

    if (requestedModule && !isModuleKey(requestedModule)) {
      response.status(400).json({ error: "El módulo solicitado no existe." });
      return;
    }

    const captures = await listCaptures(
      requestedModule && isModuleKey(requestedModule)
        ? requestedModule
        : undefined,
    );
    response.json({ captures });
  }),
);

capturesRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const { module, content } = (request.body ?? {}) as Record<string, unknown>;
    const normalizedContent = normalizeCaptureContent(content);

    if (!isModuleKey(module)) {
      response.status(400).json({ error: "Selecciona un módulo válido." });
      return;
    }
    if (!normalizedContent) {
      response
        .status(400)
        .json({ error: "Escribe entre 2 y 500 caracteres." });
      return;
    }

    const capture = await createCapture({
      module,
      content: normalizedContent,
    });
    response.status(201).json({ capture });
  }),
);

capturesRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const idParam = request.params.id;
    const id = Array.isArray(idParam) ? undefined : idParam;
    if (!id || id.length > 100) {
      response.status(400).json({ error: "El identificador no es válido." });
      return;
    }

    const deleted = await deleteCapture(id);
    if (!deleted) {
      response.status(404).json({ error: "La captura ya no existe." });
      return;
    }

    response.json({ deleted: true });
  }),
);
