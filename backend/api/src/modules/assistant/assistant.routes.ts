import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";
import {
  clearAssistantMessages,
  listAssistantMessages,
  saveAssistantMessage,
} from "./assistant.history.js";
import { answerWithNexo } from "./assistant.service.js";
import {
  normalizeAssistantFiles,
  normalizeAssistantHistory,
  normalizeAssistantMessage,
  normalizeAssistantTimeZone,
} from "./assistant.validation.js";

export const assistantRouter = Router();

assistantRouter.get(
  "/messages",
  asyncHandler(async (request, response) => {
    response.json({
      messages: await listAssistantMessages(request.authUser!.id),
    });
  }),
);

assistantRouter.delete(
  "/messages",
  asyncHandler(async (request, response) => {
    response.json({
      ok: true,
      deletedMessages: await clearAssistantMessages(request.authUser!.id),
    });
  }),
);

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
      const storedHistory = await listAssistantMessages(
        request.authUser!.id,
        12,
      );
      const result = await answerWithNexo({
        userId: request.authUser!.id,
        displayName: request.authUser!.displayName,
        message,
        timeZone: normalizeAssistantTimeZone(body.timeZone),
        history:
          storedHistory.length > 0
            ? storedHistory.map(({ role, content }) => ({ role, content }))
            : normalizeAssistantHistory(body.history),
        files,
      });
      const userMessage = await saveAssistantMessage({
        userId: request.authUser!.id,
        role: "user",
        content: message,
        attachments: files.map((file) => file.name),
      });
      const assistantMessage = await saveAssistantMessage({
        userId: request.authUser!.id,
        role: "assistant",
        content: result.answer,
        visualBlocks: result.blocks,
      });
      response.json({ answer: result.answer, blocks: result.blocks, userMessage, assistantMessage });
    } catch (error) {
      if (error instanceof Error && error.message === "OPENAI_API_KEY_NOT_CONFIGURED") {
        response.status(503).json({
          error:
            "El análisis de archivos todavía no tiene configurada su conexión de IA.",
        });
        return;
      }
      if (
        error instanceof Error &&
        error.message === "NEXO_TEXT_API_KEY_NOT_CONFIGURED"
      ) {
        response.status(503).json({
          error:
            "El asistente conversacional todavía no tiene configurado su proveedor de texto.",
        });
        return;
      }
      throw error;
    }
  }),
);
