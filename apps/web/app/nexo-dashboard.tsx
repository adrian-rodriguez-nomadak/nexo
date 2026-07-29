"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "./api-client";
import { AssistantPanel } from "./assistant-panel";
import { BetsPanel } from "./bets-panel";
import { EventsPanel } from "./events-panel";
import { FinancesPanel } from "./finances-panel";
import { GymPanel } from "./gym-panel";
import { HealthPanel } from "./health-panel";
import { MealsPanel } from "./meals-panel";
import { MemoryPanel } from "./memory-panel";
import { NotesPanel } from "./notes-panel";
import { ObserverPanel } from "./observer-panel";
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

type DashboardView =
  | ModuleKey
  | "welcome"
  | "progress"
  | "observer"
  | "memory"
  | "assistant";

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
  const [areasOpen, setAreasOpen] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!quickAddOpen && !mobileMenuOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setQuickAddOpen(false);
        setMobileMenuOpen(false);
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen, quickAddOpen]);

  function navigate(view: DashboardView): void {
    setSelectedModule(view);
    setMobileMenuOpen(false);
  }

  function openManualCapture(module: ModuleKey): void {
    setQuickAddOpen(false);
    setMobileMenuOpen(false);
    setSelectedModule(module);
  }

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
      <aside
        aria-label="Menú de Nexo"
        className={`sidebar ${mobileMenuOpen ? "sidebar-mobile-open" : ""}`}
      >
        <div className="brand">
          <span className="brand-mark">N</span>
          <span>Nexo</span>
          <button
            aria-label="Cerrar menú"
            className="mobile-drawer-close"
            onClick={() => setMobileMenuOpen(false)}
            type="button"
          >
            ×
          </button>
        </div>

        <nav className="main-nav" aria-label="Navegación principal">
          <button
            className={`nav-item ${selectedModule === "welcome" ? "nav-item-active" : ""}`}
            onClick={() => navigate("welcome")}
            type="button"
          >
            <span className="nav-symbol">●</span>
            Inicio
          </button>
          <button
            className={`nav-item ${selectedModule === "assistant" ? "nav-item-active" : ""}`}
            onClick={() => navigate("assistant")}
            type="button"
          >
            <span className="nav-symbol">✦</span>
            Asistente
          </button>
          <button
            className={`nav-item ${selectedModule === "observer" ? "nav-item-active" : ""}`}
            onClick={() => navigate("observer")}
            type="button"
          >
            <span className="nav-symbol">◉</span>
            Actividad
          </button>
          <button
            className={`nav-item ${selectedModule === "memory" ? "nav-item-active" : ""}`}
            onClick={() => navigate("memory")}
            type="button"
          >
            <span className="nav-symbol">✦</span>
            Memoria
          </button>
        </nav>

        <div className="sidebar-section">
          <button
            aria-expanded={areasOpen}
            className="areas-toggle"
            onClick={() => setAreasOpen((current) => !current)}
            type="button"
          >
            <span>Áreas</span>
            <i>{areasOpen ? "−" : "+"}</i>
          </button>
          {areasOpen ? (
            <div className="areas-list">
              {modules.map((module) => (
                <button
                  className={`module-nav ${selectedModule === module.key ? "module-nav-active" : ""}`}
                  key={module.key}
                  onClick={() => navigate(module.key)}
                  type="button"
                >
                  <span
                    className="module-dot"
                    style={{ background: module.color }}
                  />
                  {module.name}
                </button>
              ))}
              <button
                className={`module-nav ${selectedModule === "progress" ? "module-nav-active" : ""}`}
                onClick={() => navigate("progress")}
                type="button"
              >
                <span className="module-dot module-dot-all" />
                Progreso
              </button>
            </div>
          ) : null}
        </div>

        <button
          className="global-add-button"
          onClick={() => setQuickAddOpen(true)}
          type="button"
        >
          <span>＋</span>
          Agregar manualmente
        </button>

        <div className="privacy-note">
          <span className="privacy-icon">⌁</span>
          <div>
            <strong>Privado por diseño</strong>
            <span>Tus datos viven en Nexo.</span>
          </div>
        </div>
      </aside>

      {mobileMenuOpen ? (
        <button
          aria-label="Cerrar menú"
          className="mobile-menu-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          type="button"
        />
      ) : null}

      <header className="mobile-appbar">
        <button
          aria-label="Abrir menú"
          className="mobile-menu-button"
          onClick={() => setMobileMenuOpen(true)}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
        <div className="mobile-brand">
          <span>N</span>
          <strong>Nexo</strong>
        </div>
        <button
          aria-label="Abrir menú de usuario"
          className="mobile-avatar"
          onClick={() => setMobileMenuOpen(true)}
          type="button"
        >
          {userInitials(user)}
        </button>
      </header>

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
                    : selectedModule === "observer"
                      ? "Tu contexto, en movimiento."
                      : selectedModule === "memory"
                        ? "Tu contexto, bajo tu control."
                        : selectedModule === "assistant"
                          ? "Pregunta con contexto."
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
            onOpenModule={(module) => navigate(module)}
            onOpenProgress={() => navigate("progress")}
            sessionToken={sessionToken}
          />
        ) : selectedModule === "progress" ? (
          <ProgressPanel sessionToken={sessionToken} />
        ) : selectedModule === "assistant" ? (
          <AssistantPanel
            onOpenActivity={() => navigate("observer")}
            onOpenMemory={() => navigate("memory")}
          />
        ) : selectedModule === "observer" ? (
          <ObserverPanel sessionToken={sessionToken} />
        ) : selectedModule === "memory" ? (
          <MemoryPanel sessionToken={sessionToken} />
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

      <button
        aria-label="Agregar información manualmente"
        className="mobile-add-fab"
        onClick={() => setQuickAddOpen(true)}
        type="button"
      >
        ＋
      </button>

      {quickAddOpen ? (
        <div
          aria-label="Agregar información manualmente"
          aria-modal="true"
          className="quick-add-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setQuickAddOpen(false);
          }}
          role="dialog"
        >
          <section className="quick-add-modal">
            <header>
              <div>
                <span className="eyebrow">Captura manual</span>
                <h2>¿Qué quieres registrar?</h2>
              </div>
              <button
                aria-label="Cerrar"
                onClick={() => setQuickAddOpen(false)}
                type="button"
              >
                ×
              </button>
            </header>
            <p>
              Elige un área para abrir su formulario completo. Siempre podrás
              revisar y corregir los datos antes de guardarlos.
            </p>
            <div className="quick-add-grid">
              {modules.map((module) => (
                <button
                  key={module.key}
                  onClick={() => openManualCapture(module.key)}
                  type="button"
                >
                  <span style={{ background: module.color }}>
                    {module.key === "finances"
                      ? "$"
                      : module.key === "events"
                        ? "23"
                        : module.key === "notes"
                          ? "N"
                          : module.key === "meals"
                            ? "C"
                            : module.key === "health"
                              ? "+"
                              : module.key === "gym"
                                ? "KG"
                                : "A"}
                  </span>
                  <strong>{module.name}</strong>
                  <small>
                    {module.key === "finances"
                      ? "Ingreso, gasto o transferencia"
                      : module.key === "events"
                        ? "Evento o recordatorio"
                        : module.key === "notes"
                          ? "Nota, idea o lista"
                          : module.key === "meals"
                            ? "Comida y nutrición"
                            : module.key === "health"
                              ? "Medición de salud"
                              : module.key === "gym"
                                ? "Entrenamiento"
                                : "Boleto o resultado"}
                  </small>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
