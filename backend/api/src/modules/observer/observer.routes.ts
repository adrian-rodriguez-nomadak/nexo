import { Router } from "express";

import {
  isModuleKey,
  normalizeCaptureContent,
  type ModuleKey,
} from "../captures/captures.validation.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import {
  analyzeObserverFrame,
  isValidObserverImageDataUrl,
} from "./observer.analysis.js";
import {
  isObserverSubmodule,
  normalizeObserverScopes,
  scopesForModules,
} from "./observer.scopes.js";
import { createCapture } from "../captures/captures.service.js";
import { createOmiMemory } from "./observer.omi.js";
import { remember } from "../memories/memories.service.js";
import { normalizeMemoryConfidence } from "../memories/memories.validation.js";

export const observerRouter = Router();

observerRouter.post(
  "/analyze",
  asyncHandler(async (request, response) => {
    const { imageDataUrl, enabledModules, enabledScopes } = (
      request.body ?? {}
    ) as Record<string, unknown>;
    const normalizedModules = Array.isArray(enabledModules)
      ? [...new Set(enabledModules.filter(isModuleKey))]
      : [];
    const normalizedScopes = normalizeObserverScopes(enabledScopes);
    const effectiveScopes =
      normalizedScopes.length > 0
        ? normalizedScopes
        : scopesForModules(normalizedModules as ModuleKey[]);

    if (
      !isValidObserverImageDataUrl(imageDataUrl) ||
      effectiveScopes.length === 0
    ) {
      response.status(400).json({
        error:
          "Envía una captura JPEG y al menos un módulo o submódulo autorizado.",
      });
      return;
    }

    try {
      const detection = await analyzeObserverFrame({
        imageDataUrl,
        enabledScopes: effectiveScopes,
      });
      response.json({ detection });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "OPENAI_API_KEY_NOT_CONFIGURED"
      ) {
        response.status(503).json({
          error: "El análisis del Observador todavía no está configurado.",
        });
        return;
      }
      throw error;
    }
  }),
);

observerRouter.post(
  "/save",
  asyncHandler(async (request, response) => {
    const { module, submodule, content, confidence, userConfirmed } = (
      request.body ?? {}
    ) as Record<string, unknown>;
    const normalizedContent = normalizeCaptureContent(content);
    const normalizedConfidence = normalizeMemoryConfidence(confidence);
    if (
      !isModuleKey(module) ||
      !isObserverSubmodule(module, submodule) ||
      !normalizedContent ||
      normalizedConfidence === null ||
      typeof userConfirmed !== "boolean"
    ) {
      response.status(400).json({
        error: "La detección no contiene un registro válido.",
      });
      return;
    }

    const capture = await createCapture({
      userId: request.authUser!.id,
      module,
      submodule,
      content: normalizedContent,
    });
    const memory = await remember({
      userId: request.authUser!.id,
      content: normalizedContent,
      kind: module === "events" ? "event" : "fact",
      module,
      source: "observer",
      sourceRecordIds: [capture.id],
      confidence: normalizedConfidence,
      sensitivity:
        module === "health" || module === "finances" || module === "bets"
          ? "sensitive"
          : "normal",
      userConfirmed,
    });
    let omiSynced = false;
    let omiWarning: string | null = null;
    try {
      omiSynced = await createOmiMemory({
        module,
        submodule,
        content: normalizedContent,
      });
      if (!omiSynced) {
        omiWarning = "Configura OMI_API_KEY para sincronizar con Omi.";
      }
    } catch (error) {
      omiWarning =
        error instanceof Error
          ? error.message
          : "No fue posible sincronizar con Omi.";
    }

    response.status(201).json({ capture, memory, omiSynced, omiWarning });
  }),
);
