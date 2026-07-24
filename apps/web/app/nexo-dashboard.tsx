"use client";

import { useState } from "react";

import { apiFetch } from "./api-client";
import { BetsPanel } from "./bets-panel";
import { EventsPanel } from "./events-panel";
import { FinancesPanel } from "./finances-panel";
import { GymPanel } from "./gym-panel";
import { HealthPanel } from "./health-panel";
import { MealsPanel } from "./meals-panel";
import { NotesPanel } from "./notes-panel";
import { ProgressPanel } from "./progress-panel";
import { WelcomePanel } from "./welcome-panel";

type DashboardUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

type ModuleKey =
  | "finances"
  | "events"
  | "notes"
  | "bets"
  | "meals"
  | "health"
  | "gym";

type DashboardView = ModuleKey | "welcome" | "progress";

type ModuleDefinition = {
  key: ModuleKey;
  name: string;
  color: string;
};

const modules: ModuleDefinition[] = [
  {
    key: "finances",
    name: "Finanzas",
    color: "#78d6a3",
  },
  {
    key: "events",
    name: "Eventos",
    color: "#8cb4ff",
  },
  {
    key: "notes",
    name: "Notas",
    color: "#ffd166",
  },
  {
    key: "bets",
    name: "Apuestas",
    color: "#d39bff",
  },
  {
    key: "meals",
    name: "Comidas",
    color: "#ff9e75",
  },
  {
    key: "health",
    name: "Salud",
    color: "#ff7f96",
  },
  {
    key: "gym",
    name: "Gimnasio",
    color: "#75d8e8",
  },
];

function formatToday(): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function userInitials(user: DashboardUser): string {
  const source = user.fullName ?? user.email.split("@")[0] ?? "N";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ignoreCount(): void {}

export function NexoDashboard({
  onSignOut,
  sessionToken,
  signOutPath,
  user,
}: {
  onSignOut?: () => void;
  sessionToken: string;
  signOutPath: string;
  user: DashboardUser;
}) {
  const [selectedModule, setSelectedModule] =
    useState<DashboardView>("welcome");

  async function signOut() {
    try {
      await apiFetch("/api/auth/logout", sessionToken, { method: "POST" });
    } finally {
      onSignOut?.();
      window.location.assign(signOutPath);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <span>Nexo</span>
        </div>

        <nav className="main-nav" aria-label="Navegación principal">
          <button
            className={`nav-item ${selectedModule === "welcome" ? "nav-item-active" : ""}`}
            onClick={() => setSelectedModule("welcome")}
            type="button"
          >
            <span className="nav-symbol">●</span>
            Inicio
          </button>
          <button
            className={`nav-item ${selectedModule === "progress" ? "nav-item-active" : ""}`}
            onClick={() => setSelectedModule("progress")}
            type="button"
          >
            <span className="nav-symbol">◇</span>
            Progreso
          </button>
        </nav>

        <div className="sidebar-section">
          <p className="sidebar-label">Módulos</p>
          {modules.map((module) => (
            <button
              className={`module-nav ${selectedModule === module.key ? "module-nav-active" : ""}`}
              key={module.key}
              onClick={() => setSelectedModule(module.key)}
              type="button"
            >
              <span
                className="module-dot"
                style={{ background: module.color }}
              />
              {module.name}
            </button>
          ))}
        </div>

        <div className="privacy-note">
          <span className="privacy-icon">⌁</span>
          <div>
            <strong>Privado por diseño</strong>
            <span>Tus datos viven en Nexo.</span>
          </div>
        </div>
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <div>
            <span className="eyebrow">{formatToday()}</span>
            <h1>
              {selectedModule === "finances"
                ? "Tu dinero, claro."
                : selectedModule === "welcome"
                  ? `Bienvenido, ${user.displayName.split(/\s+/)[0] ?? user.displayName}.`
                  : selectedModule === "progress"
                    ? "Tu progreso, en perspectiva."
                : selectedModule === "events"
                  ? "Tu agenda, en orden."
                  : selectedModule === "notes"
                    ? "Tus ideas, encontrables."
                    : selectedModule === "bets"
                      ? "Tus límites, primero."
                      : selectedModule === "meals"
                        ? "Tu alimentación, visible."
                        : selectedModule === "health"
                          ? "Tu salud, con contexto."
                        : "Tu progreso, medible."}
            </h1>
          </div>
          <div className="profile">
            <span className="status-dot" />
            <span className="profile-identity">
              <strong>{user.displayName}</strong>
              <span>{user.email}</span>
            </span>
            <span className="avatar">{userInitials(user)}</span>
            <button
              className="sign-out-link"
              onClick={() => void signOut()}
              type="button"
            >
              Salir
            </button>
          </div>
        </header>

        {selectedModule === "welcome" ? (
          <WelcomePanel
            displayName={user.displayName}
            onOpenModule={(module) => setSelectedModule(module)}
            onOpenProgress={() => setSelectedModule("progress")}
            sessionToken={sessionToken}
          />
        ) : selectedModule === "progress" ? (
          <ProgressPanel sessionToken={sessionToken} />
        ) : selectedModule === "finances" ? (
          <FinancesPanel sessionToken={sessionToken} />
        ) : selectedModule === "events" ? (
          <EventsPanel
            onCountChange={ignoreCount}
            sessionToken={sessionToken}
          />
        ) : selectedModule === "notes" ? (
          <NotesPanel
            onCountChange={ignoreCount}
            sessionToken={sessionToken}
          />
        ) : selectedModule === "bets" ? (
          <BetsPanel
            onCountChange={ignoreCount}
            sessionToken={sessionToken}
          />
        ) : selectedModule === "meals" ? (
          <MealsPanel
            onCountChange={ignoreCount}
            sessionToken={sessionToken}
          />
        ) : selectedModule === "health" ? (
          <HealthPanel
            onCountChange={ignoreCount}
            sessionToken={sessionToken}
          />
        ) : (
          <GymPanel
            onCountChange={ignoreCount}
            sessionToken={sessionToken}
          />
        )}
      </main>
    </div>
  );
}
