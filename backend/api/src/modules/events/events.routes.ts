import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";
import {
  createEvent,
  deleteEvent,
  listEvents,
} from "./events.service.js";
import {
  isValidEventRange,
  normalizeEventDate,
  normalizeEventText,
  normalizeOptionalEventText,
} from "./events.validation.js";

export const eventsRouter = Router();

eventsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    response.json({ events: await listEvents(request.authUser!.id) });
  }),
);

eventsRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const {
      title,
      description,
      location,
      startsAt,
      endsAt,
      allDay,
    } = (request.body ?? {}) as Record<string, unknown>;
    const normalizedTitle = normalizeEventText(title, 100);
    const normalizedDescription = normalizeOptionalEventText(description, 1000);
    const normalizedLocation = normalizeOptionalEventText(location, 160);
    const normalizedStartsAt = normalizeEventDate(startsAt);
    const hasDescription =
      description !== null && description !== undefined && description !== "";
    const hasLocation =
      location !== null && location !== undefined && location !== "";
    const hasEnd = endsAt !== null && endsAt !== undefined && endsAt !== "";
    const normalizedEndsAt =
      hasEnd ? normalizeEventDate(endsAt) : null;

    if (
      !normalizedTitle ||
      !normalizedStartsAt ||
      (hasDescription && !normalizedDescription) ||
      (hasLocation && !normalizedLocation) ||
      (hasEnd && !normalizedEndsAt) ||
      (allDay !== undefined && typeof allDay !== "boolean") ||
      !isValidEventRange(normalizedStartsAt, normalizedEndsAt)
    ) {
      response.status(400).json({
        error: "Revisa el título, la fecha y la duración del evento.",
      });
      return;
    }

    const event = await createEvent({
      userId: request.authUser!.id,
      title: normalizedTitle,
      description: normalizedDescription,
      location: normalizedLocation,
      startsAt: normalizedStartsAt,
      endsAt: normalizedEndsAt,
      allDay: allDay === true,
    });
    response.status(201).json({ event });
  }),
);

eventsRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const idParam = request.params.id;
    const id = Array.isArray(idParam) ? undefined : idParam;
    if (!id || id.length > 100) {
      response.status(400).json({ error: "El identificador no es válido." });
      return;
    }

    const deleted = await deleteEvent(request.authUser!.id, id);
    if (!deleted) {
      response.status(404).json({ error: "El evento ya no existe." });
      return;
    }

    response.json({ deleted: true });
  }),
);
