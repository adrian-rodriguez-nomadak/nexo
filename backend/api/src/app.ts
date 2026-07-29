import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";

import { env } from "./config/env.js";
import { assistantRouter } from "./modules/assistant/assistant.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { requireAuth } from "./modules/auth/auth.middleware.js";
import { betsRouter } from "./modules/bets/bets.routes.js";
import { capturesRouter } from "./modules/captures/captures.routes.js";
import { eventsRouter } from "./modules/events/events.routes.js";
import { financesRouter } from "./modules/finances/finances.routes.js";
import { gymRouter } from "./modules/gym/gym.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { mealsRouter } from "./modules/meals/meals.routes.js";
import { memoriesRouter } from "./modules/memories/memories.routes.js";
import { notesRouter } from "./modules/notes/notes.routes.js";
import { observerRouter } from "./modules/observer/observer.routes.js";
import { progressRouter } from "./modules/progress/progress.routes.js";
import { query } from "./shared/db/database.js";
import { asyncHandler } from "./shared/http/async-handler.js";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        env.CORS_ORIGINS.includes("*") ||
        env.CORS_ORIGINS.includes(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error("Origen no permitido por CORS."));
    },
  }),
);
app.use(express.json({ limit: "28mb" }));

const healthHandler = asyncHandler(async (_request, response) => {
  await query("SELECT 1");
  response.json({
    ok: true,
    service: "nexo-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", healthHandler);
app.use("/api/auth", authRouter);
app.use("/api/assistant", requireAuth, assistantRouter);
app.use("/api/bets", requireAuth, betsRouter);
app.use("/api/captures", requireAuth, capturesRouter);
app.use("/api/events", requireAuth, eventsRouter);
app.use("/api/finances", requireAuth, financesRouter);
app.use("/api/gym", requireAuth, gymRouter);
app.use("/api/health", requireAuth, healthRouter);
app.use("/api/meals", requireAuth, mealsRouter);
app.use("/api/memories", requireAuth, memoriesRouter);
app.use("/api/notes", requireAuth, notesRouter);
app.use("/api/observer", requireAuth, observerRouter);
app.use("/api/progress", requireAuth, progressRouter);

const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({ error: "Ruta no encontrada." });
};
app.use(notFoundHandler);

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({ error: "El cuerpo de la solicitud no es válido." });
    return;
  }
  if (error instanceof Error && error.message === "Origen no permitido por CORS.") {
    response.status(403).json({ error: error.message });
    return;
  }

  console.error("Unhandled API error", error);
  response.status(500).json({ error: "Ocurrió un error inesperado." });
};
app.use(errorHandler);
