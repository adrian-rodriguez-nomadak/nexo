import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";
import { searchExerciseCatalog } from "./gym.catalog.js";
import {
  createWorkout,
  deleteWorkout,
  listWorkouts,
} from "./gym.service.js";
import {
  normalizeExercises,
  normalizeGymDate,
  normalizeGymText,
  normalizeOptionalGymInteger,
  normalizeOptionalGymText,
} from "./gym.validation.js";

export const gymRouter = Router();

gymRouter.get(
  "/catalog",
  asyncHandler(async (request, response) => {
    const query =
      typeof request.query.q === "string"
        ? normalizeGymText(request.query.q, 80)
        : null;
    if (!query) {
      response.status(400).json({ error: "Escribe al menos dos caracteres." });
      return;
    }

    try {
      response.json({
        exercises: await searchExerciseCatalog(query),
        source: "wger",
      });
    } catch {
      response.status(502).json({
        error: "El catálogo de ejercicios no está disponible por el momento.",
      });
    }
  }),
);

gymRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    response.json({ workouts: await listWorkouts(request.authUser!.id) });
  }),
);

gymRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const { title, notes, durationMinutes, exercises, trainedAt } = (
      request.body ?? {}
    ) as Record<string, unknown>;
    const normalizedTitle = normalizeOptionalGymText(title, 120);
    const normalizedNotes = normalizeOptionalGymText(notes, 1000);
    const normalizedDuration = normalizeOptionalGymInteger(
      durationMinutes,
      1_440,
    );
    const normalizedExercises = normalizeExercises(exercises);
    const normalizedTrainedAt = normalizeGymDate(trainedAt);
    const hasNotes =
      notes !== null && notes !== undefined && notes !== "";
    const hasTitle =
      title !== undefined && title !== null && title !== "";

    if (
      (hasTitle && !normalizedTitle) ||
      (hasNotes && !normalizedNotes) ||
      !normalizedDuration ||
      !normalizedExercises ||
      !normalizedTrainedAt
    ) {
      response.status(400).json({
        error:
          "Revisa el nombre, duración, fecha y ejercicios del entrenamiento.",
      });
      return;
    }

    const workout = await createWorkout({
      userId: request.authUser!.id,
      title:
        normalizedTitle ??
        `Sesión · ${normalizedTrainedAt.slice(0, 10)}`,
      notes: normalizedNotes,
      durationMinutes: normalizedDuration,
      exercises: normalizedExercises,
      trainedAt: normalizedTrainedAt,
    });
    response.status(201).json({ workout });
  }),
);

gymRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const idParam = request.params.id;
    const id = Array.isArray(idParam) ? undefined : idParam;
    if (!id || id.length > 100) {
      response.status(400).json({ error: "El identificador no es válido." });
      return;
    }

    const deleted = await deleteWorkout(request.authUser!.id, id);
    if (!deleted) {
      response.status(404).json({ error: "El entrenamiento ya no existe." });
      return;
    }

    response.json({ deleted: true });
  }),
);
