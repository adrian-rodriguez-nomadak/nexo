"use client";

import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiFetch } from "./api-client";
import type { ChatGPTUser } from "./chatgpt-auth";
import { EventsPanel } from "./events-panel";
import { FinancesPanel } from "./finances-panel";

type ModuleKey =
  | "finances"
  | "events"
  | "notes"
  | "bets"
  | "meals"
  | "health"
  | "gym";

type CaptureRecord = {
  id: string;
  module: ModuleKey;
  content: string;
  createdAt: string;
  occurredAt: string | null;
  amountCents: number | null;
};

type ModuleDefinition = {
  key: ModuleKey;
  name: string;
  description: string;
  mark: string;
  color: string;
  prompt: string;
};

const modules: ModuleDefinition[] = [
  {
    key: "finances",
    name: "Finanzas",
    description: "Dinero, presupuestos y metas",
    mark: "$",
    color: "#78d6a3",
    prompt: "Ej. Gasté $280 en una cena",
  },
  {
    key: "events",
    name: "Eventos",
    description: "Agenda y recordatorios",
    mark: "23",
    color: "#8cb4ff",
    prompt: "Ej. Partido el sábado a las 7",
  },
  {
    key: "notes",
    name: "Notas",
    description: "Ideas, listas y memoria",
    mark: "N",
    color: "#ffd166",
    prompt: "Ej. Idea para conectar mis hábitos",
  },
  {
    key: "bets",
    name: "Apuestas",
    description: "Bankroll, límites y resultados",
    mark: "1.8",
    color: "#d39bff",
    prompt: "Ej. Aposté $100 con cuota 1.8",
  },
  {
    key: "meals",
    name: "Comidas",
    description: "Alimentos, macros y costos",
    mark: "C",
    color: "#ff9e75",
    prompt: "Ej. Comí pollo con arroz",
  },
  {
    key: "health",
    name: "Salud",
    description: "Sueño, agua y bienestar",
    mark: "+",
    color: "#ff7f96",
    prompt: "Ej. Dormí 7 horas",
  },
  {
    key: "gym",
    name: "Gimnasio",
    description: "Rutinas, marcas y progreso",
    mark: "KG",
    color: "#75d8e8",
    prompt: "Ej. Press banca 4×8 con 70 kg",
  },
];

const moduleByKey = Object.fromEntries(
  modules.map((module) => [module.key, module]),
) as Record<ModuleKey, ModuleDefinition>;

function formatToday(): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function userInitials(user: ChatGPTUser): string {
  const source = user.fullName ?? user.email.split("@")[0] ?? "N";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function NexoDashboard({
  sessionToken,
  signOutPath,
  user,
}: {
  sessionToken: string;
  signOutPath: string;
  user: ChatGPTUser;
}) {
  const [captures, setCaptures] = useState<CaptureRecord[]>([]);
  const [eventsCount, setEventsCount] = useState(0);
  const [selectedModule, setSelectedModule] = useState<ModuleKey | "all">("all");
  const [captureModule, setCaptureModule] = useState<ModuleKey>("notes");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadCaptures() {
      try {
        const response = await apiFetch(
          "/api/captures",
          sessionToken,
        );
        const data = (await response.json()) as {
          captures?: CaptureRecord[];
          error?: string;
        };

        if (!response.ok) throw new Error(data.error);
        if (active) setCaptures(data.captures ?? []);
      } catch {
        if (active) setError("No pudimos conectar con el backend.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadCaptures();
    return () => {
      active = false;
    };
  }, [sessionToken]);

  const visibleCaptures = useMemo(
    () =>
      selectedModule === "all"
        ? captures
        : captures.filter((capture) => capture.module === selectedModule),
    [captures, selectedModule],
  );

  const activeModules = useMemo(
    () => new Set(captures.map((capture) => capture.module)).size,
    [captures],
  );

  const todayCount = useMemo(() => {
    const now = new Date();
    return captures.filter((capture) => {
      const date = new Date(capture.createdAt);
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    }).length;
  }, [captures]);

  async function submitCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (content.trim().length < 2 || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await apiFetch("/api/captures", sessionToken, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          module: captureModule,
          content,
        }),
      });
      const data = (await response.json()) as {
        capture?: CaptureRecord;
        error?: string;
      };

      if (!response.ok || !data.capture) {
        throw new Error(data.error ?? "No fue posible guardar.");
      }

      setCaptures((current) => [data.capture!, ...current]);
      setContent("");
      setSelectedModule("all");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar la captura.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeCapture(id: string) {
    const previous = captures;
    setCaptures((current) => current.filter((capture) => capture.id !== id));

    try {
      const response = await apiFetch(
        `/api/captures/${id}`,
        sessionToken,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) throw new Error();
    } catch {
      setCaptures(previous);
      setError("No fue posible eliminar la captura.");
    }
  }

  async function signOut() {
    try {
      await apiFetch("/api/auth/logout", sessionToken, { method: "POST" });
    } finally {
      window.location.assign(signOutPath);
    }
  }

  const selectedCaptureModule = moduleByKey[captureModule];
  const moduleCount = (module: ModuleKey) =>
    module === "events"
      ? eventsCount
      : captures.filter((capture) => capture.module === module).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <span>Nexo</span>
        </div>

        <nav className="main-nav" aria-label="Navegación principal">
          <button
            className={`nav-item ${selectedModule === "all" ? "nav-item-active" : ""}`}
            onClick={() => setSelectedModule("all")}
            type="button"
          >
            <span className="nav-symbol">●</span>
            Hoy
          </button>
          <button className="nav-item" type="button">
            <span className="nav-symbol">◇</span>
            Progreso
          </button>
        </nav>

        <div className="sidebar-section">
          <p className="sidebar-label">Módulos</p>
          <button
            className={`module-nav ${selectedModule === "all" ? "module-nav-active" : ""}`}
            onClick={() => setSelectedModule("all")}
            type="button"
          >
            <span className="module-dot module-dot-all" />
            Todos
            <span className="module-count">{captures.length}</span>
          </button>
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
              <span className="module-count">
                {moduleCount(module.key)}
              </span>
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
                : selectedModule === "events"
                  ? "Tu agenda, en orden."
                  : "Tu día, conectado."}
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

        {selectedModule === "finances" ? (
          <FinancesPanel sessionToken={sessionToken} />
        ) : selectedModule === "events" ? (
          <EventsPanel
            onCountChange={setEventsCount}
            sessionToken={sessionToken}
          />
        ) : (
          <section className="dashboard-grid">
          <div className="primary-column">
            <form className="capture-card" onSubmit={submitCapture}>
              <div className="capture-copy">
                <span className="capture-kicker">Captura rápida</span>
                <h2>¿Qué está pasando hoy?</h2>
                <p>
                  Registra un gasto, una idea, una comida o un entrenamiento.
                </p>
              </div>

              <div className="module-picker" role="group" aria-label="Módulo">
                {modules.map((module) => (
                  <button
                    aria-label={module.name}
                    className={`module-pill ${captureModule === module.key ? "module-pill-active" : ""}`}
                    key={module.key}
                    onClick={() => setCaptureModule(module.key)}
                    style={
                      {
                        "--module-color": module.color,
                      } as CSSProperties
                    }
                    type="button"
                  >
                    <span>{module.mark}</span>
                    {module.name}
                  </button>
                ))}
              </div>

              <label className="capture-input">
                <span className="sr-only">Nueva captura</span>
                <textarea
                  data-testid="capture-input"
                  maxLength={500}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder={selectedCaptureModule.prompt}
                  rows={2}
                  value={content}
                />
                <button
                  data-testid="save-capture"
                  disabled={content.trim().length < 2 || isSaving}
                  type="submit"
                >
                  {isSaving ? "Guardando…" : "Guardar"}
                  <span aria-hidden="true">↑</span>
                </button>
              </label>
              {error ? <p className="form-error">{error}</p> : null}
            </form>

            <section className="activity-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Actividad</span>
                  <h2>
                    {selectedModule === "all"
                      ? "Capturas recientes"
                      : moduleByKey[selectedModule].name}
                  </h2>
                </div>
                <span className="record-count">
                  {visibleCaptures.length}{" "}
                  {visibleCaptures.length === 1 ? "registro" : "registros"}
                </span>
              </div>

              <div className="activity-list" aria-live="polite">
                {isLoading ? (
                  <div className="empty-state">
                    <span className="empty-mark">···</span>
                    <h3>Conectando con Nexo</h3>
                  </div>
                ) : visibleCaptures.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-mark">+</span>
                    <h3>Aquí comienza tu contexto</h3>
                    <p>
                      Agrega la primera captura para probar el flujo completo.
                    </p>
                  </div>
                ) : (
                  visibleCaptures.map((capture) => {
                    const captureModuleDefinition =
                      moduleByKey[capture.module];
                    return (
                      <article className="activity-item" key={capture.id}>
                        <span
                          className="activity-mark"
                          style={
                            {
                              "--module-color": captureModuleDefinition.color,
                            } as CSSProperties
                          }
                        >
                          {captureModuleDefinition.mark}
                        </span>
                        <div className="activity-content">
                          <div>
                            <span
                              style={{ color: captureModuleDefinition.color }}
                            >
                              {captureModuleDefinition.name}
                            </span>
                            <time dateTime={capture.createdAt}>
                              {formatTime(capture.createdAt)}
                            </time>
                          </div>
                          <p>{capture.content}</p>
                        </div>
                        <button
                          aria-label={`Eliminar: ${capture.content}`}
                          className="delete-button"
                          onClick={() => void removeCapture(capture.id)}
                          type="button"
                        >
                          ×
                        </button>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <aside className="insight-column">
            <section className="summary-card">
              <span className="eyebrow">Resumen de hoy</span>
              <div className="summary-number">{todayCount}</div>
              <p>capturas registradas</p>
              <div className="summary-row">
                <span>
                  <strong>{activeModules}</strong>
                  módulos activos
                </span>
                <span>
                  <strong>{captures.length}</strong>
                  registros totales
                </span>
              </div>
            </section>

            <section className="connections-card">
              <div className="section-heading compact-heading">
                <div>
                  <span className="eyebrow">Próximamente</span>
                  <h2>Conexiones</h2>
                </div>
                <span className="lock-mark">⌁</span>
              </div>
              <div className="connection-item">
                <span className="connection-pair">
                  <i style={{ background: moduleByKey.meals.color }}>C</i>
                  <i style={{ background: moduleByKey.finances.color }}>$</i>
                </span>
                <span>
                  <strong>Comidas × Finanzas</strong>
                  Costo y presupuesto
                </span>
              </div>
              <div className="connection-item">
                <span className="connection-pair">
                  <i style={{ background: moduleByKey.gym.color }}>KG</i>
                  <i style={{ background: moduleByKey.health.color }}>+</i>
                </span>
                <span>
                  <strong>Gimnasio × Salud</strong>
                  Esfuerzo y recuperación
                </span>
              </div>
              <div className="connection-item">
                <span className="connection-pair">
                  <i style={{ background: moduleByKey.bets.color }}>1.8</i>
                  <i style={{ background: moduleByKey.finances.color }}>$</i>
                </span>
                <span>
                  <strong>Apuestas × Finanzas</strong>
                  Riesgo y límites
                </span>
              </div>
            </section>
          </aside>
          </section>
        )}
      </main>
    </div>
  );
}
