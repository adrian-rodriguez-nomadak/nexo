import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";
import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
} from "./notes.service.js";
import {
  normalizeNoteContent,
  normalizeNoteTags,
  normalizeNoteTitle,
} from "./notes.validation.js";

export const notesRouter = Router();

notesRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    response.json({ notes: await listNotes(request.authUser!.id) });
  }),
);

notesRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const { title, content, tags, isPinned } = (request.body ?? {}) as Record<
      string,
      unknown
    >;
    const normalizedTitle = normalizeNoteTitle(title);
    const normalizedContent = normalizeNoteContent(content);
    const normalizedTags = normalizeNoteTags(tags ?? []);

    if (
      !normalizedTitle ||
      !normalizedContent ||
      !normalizedTags ||
      (isPinned !== undefined && typeof isPinned !== "boolean")
    ) {
      response.status(400).json({
        error: "Revisa el título, contenido y etiquetas de la nota.",
      });
      return;
    }

    const note = await createNote({
      userId: request.authUser!.id,
      title: normalizedTitle,
      content: normalizedContent,
      tags: normalizedTags,
      isPinned: isPinned === true,
    });
    response.status(201).json({ note });
  }),
);

notesRouter.patch(
  "/:id",
  asyncHandler(async (request, response) => {
    const idParam = request.params.id;
    const id = Array.isArray(idParam) ? undefined : idParam;
    const { title, content, tags, isPinned } = (request.body ?? {}) as Record<
      string,
      unknown
    >;
    const normalizedTitle = normalizeNoteTitle(title);
    const normalizedContent = normalizeNoteContent(content);
    const normalizedTags = normalizeNoteTags(tags ?? []);

    if (
      !id ||
      id.length > 100 ||
      !normalizedTitle ||
      !normalizedContent ||
      !normalizedTags ||
      typeof isPinned !== "boolean"
    ) {
      response.status(400).json({
        error: "Revisa el título, contenido y etiquetas de la nota.",
      });
      return;
    }

    const note = await updateNote({
      id,
      userId: request.authUser!.id,
      title: normalizedTitle,
      content: normalizedContent,
      tags: normalizedTags,
      isPinned,
    });
    if (!note) {
      response.status(404).json({ error: "La nota ya no existe." });
      return;
    }

    response.json({ note });
  }),
);

notesRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const idParam = request.params.id;
    const id = Array.isArray(idParam) ? undefined : idParam;
    if (!id || id.length > 100) {
      response.status(400).json({ error: "El identificador no es válido." });
      return;
    }

    const deleted = await deleteNote(request.authUser!.id, id);
    if (!deleted) {
      response.status(404).json({ error: "La nota ya no existe." });
      return;
    }

    response.json({ deleted: true });
  }),
);
