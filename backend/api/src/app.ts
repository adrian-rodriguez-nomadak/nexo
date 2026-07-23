import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";

import { env } from "./config/env.js";
import { capturesRouter } from "./modules/captures/captures.routes.js";
import { financesRouter } from "./modules/finances/finances.routes.js";
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
app.use(express.json({ limit: "1mb" }));

const healthHandler = asyncHandler(async (_request, response) => {
  await query("SELECT 1");
  response.json({
    ok: true,
    service: "nexo-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);
app.use("/api/captures", capturesRouter);
app.use("/api/finances", financesRouter);

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
