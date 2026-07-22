import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { errorMiddleware } from "./shared/middlewares/error.middleware.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { financesRoutes } from "./modules/finances/finances.routes.js";
import { subscriptionsRoutes } from "./modules/subscriptions/subscriptions.routes.js";
import { debtsRoutes } from "./modules/debts/debts.routes.js";
import { calendarRoutes } from "./modules/calendar/calendar.routes.js";
import { tasksRoutes } from "./modules/tasks/tasks.routes.js";
import { remindersRoutes } from "./modules/reminders/reminders.routes.js";
import { inboxRoutes } from "./modules/inbox/inbox.routes.js";
import { aiRoutes, publicAiRoutes } from "./modules/ai/ai.routes.js";
import { syncRoutes } from "./modules/sync/sync.routes.js";
import { authMiddleware } from "./shared/middlewares/auth.middleware.js";
import { withUserContext } from "./shared/auth/user-context.js";
import { env } from "./config/env.js";

export const app = express();

function isLocalWebOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        env.nodeEnv !== "production" ||
        isLocalWebOrigin(origin) ||
        env.corsOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed"));
    },
  }),
);
app.use(express.json({ limit: "256kb" }));
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({ ok: true, app: "Nexo API", health: "/health" });
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    app: "Nexo API",
    version: "0.1.0",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/public/ai", publicAiRoutes);
app.use("/api", authMiddleware, withUserContext);
app.use("/api/users", usersRoutes);
app.use("/api/finances", financesRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/debts", debtsRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/reminders", remindersRoutes);
app.use("/api/inbox", inboxRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/sync", syncRoutes);

app.use(errorMiddleware);
