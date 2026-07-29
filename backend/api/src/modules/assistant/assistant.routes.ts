import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";
import { answerWithNexo } from "./assistant.service.js";
import {
  normalizeAssistantFiles,
  normalizeAssistantHistory,
  normalizeAssistantMessage,
} from "./assistant.validation.js";

export const assistantRouter = Router();

assistantRouter.post(
  "/messages",
  asyncHandler(async (request, response) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const message = normalizeAssistantMessage(body.message);
    const files = normalizeAssistantFiles(body.files);
    if (!message || files === null) {
      response.status(400).json({
        error:
          "Envía un mensaje y hasta 5 archivos compatibles (8 MB por archivo, 20 MB en total).",
      });
      return;
    }

    try {
      const answer = await answerWithNexo({
        userId: request.authUser!.id,
        displayName: request.authUser!.displayName,
        message,
        history: normalizeAssistantHistory(body.history),
        files,
      });
      response.json({ answer });
    } catch (error) {
      if (error instanceof Error && error.message === "OPENAI_API_KEY_NOT_CONFIGURED") {
        response.status(503).json({
          error: "El asistente todavía no tiene configurada su conexión de IA.",
        });
        return;
      }
      throw error;
    }
  }),
);
