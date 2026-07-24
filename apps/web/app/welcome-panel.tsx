"use client";

import { useEffect, useMemo, useState } from "react";

import {
  loadProgress,
  type ProgressData,
} from "./progress-data";

type WelcomeModule =
  | "finances"
  | "events"
  | "notes"
  | "meals"
  | "health"
  | "gym";

const setupModules: Array<{
  key: WelcomeModule;
  label: string;
  description: string;
  mark: string;
  color: string;
}> = [
  {
    key: "finances",
    label: "Crea tu primera cuenta",
    description: "Conecta tus decisiones con dinero real.",
    mark: "$",
    color: "#78d6a3",
  },
  {
    key: "events",
    label: "Agrega un evento",
    description: "Dale contexto a tu tiempo.",
    mark: "23",
    color: "#8cb4ff",
  },
  {
    key: "notes",
    label: "Guarda una nota",
    description: "Empieza a construir tu memoria.",
    mark: "N",
    color: "#ffd166",
  },
  {
    key: "meals",
    label: "Registra una comida",
    description: "Observa alimentación, macros y costo.",
    mark: "C",
    color: "#ff9e75",
  },
  {
    key: "health",
    label: "Crea tu línea de salud",
    description: "Guarda una primera medición.",
    mark: "+",
    color: "#ff7f96",
  },
  {
    key: "gym",
    label: "Registra una sesión",
    description: "Convierte esfuerzo en progreso visible.",
    mark: "KG",
    color: "#75d8e8",
  },
];

const moneyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const eventFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}

export function WelcomePanel({
  displayName,
  onOpenModule,
  onOpenProgress,
  sessionToken,
}: {
  displayName: string;
  onOpenModule: (module: WelcomeModule) => void;
  onOpenProgress: () => void;
  sessionToken: string;
}) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadProgress(sessionToken, 7)
      .then((nextData) => {
        if (active) setData(nextData);
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "No fue posible cargar tu bienvenida.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [sessionToken]);

  const completedSetup = useMemo(
    () =>
      setupModules.filter((module) => data?.welcome.setup[module.key]).length,
    [data],
  );
  const setupPercent = Math.round((completedSetup / setupModules.length) * 100);
  const nextSetup = setupModules.find(
    (module) => !data?.welcome.setup[module.key],
  );

  if (!data && !error) {
    return (
      <section className="welcome-loading">
        <span>N</span>
        Preparando tu inicio…
      </section>
    );
  }

  return (
    <section className="welcome-workspace">
      {error ? <p className="welcome-error">{error}</p> : null}

      <section className="welcome-hero">
        <div>
          <span className="welcome-kicker">Tu espacio personal</span>
          <h2>
            Hola, {firstName(displayName)}.
            <strong>
              {data?.overview.totalRecords
                ? " Sigue construyendo contexto."
                : " Aquí empieza tu contexto."}
            </strong>
          </h2>
          <p>
            Nexo reúne las pequeñas decisiones de tu día para ayudarte a ver
            relaciones que antes vivían separadas.
          </p>
          <div className="welcome-hero-actions">
            <button
              onClick={() =>
                onOpenModule(nextSetup?.key ?? "notes")
              }
              type="button"
            >
              {nextSetup ? nextSetup.label : "Agregar un registro"}
              <span>→</span>
            </button>
            <button onClick={onOpenProgress} type="button">
              Ver mi progreso
            </button>
          </div>
        </div>
        <div className="welcome-orbit" aria-hidden="true">
          <span className="welcome-orbit-center">N</span>
          <i className="welcome-orbit-item welcome-orbit-finance">$</i>
          <i className="welcome-orbit-item welcome-orbit-health">+</i>
          <i className="welcome-orbit-item welcome-orbit-gym">KG</i>
          <i className="welcome-orbit-item welcome-orbit-notes">N</i>
        </div>
      </section>

      <div className="welcome-summary-grid">
        <article>
          <span>Saldo conectado</span>
          <strong>
            {moneyFormatter.format((data?.finances.balanceCents ?? 0) / 100)}
          </strong>
          <p>{data?.finances.transactionCount ?? 0} movimientos esta semana</p>
        </article>
        <article>
          <span>Registros de hoy</span>
          <strong>{data?.welcome.todayRecords ?? 0}</strong>
          <p>en todos tus módulos</p>
        </article>
        <article>
          <span>Días activos</span>
          <strong>
            {data?.overview.activeDays ?? 0}
            <small>/7</small>
          </strong>
          <p>constancia de esta semana</p>
        </article>
        <article className="welcome-next-event">
          <span>Próximo evento</span>
          {data?.welcome.upcomingEvent ? (
            <>
              <strong>{data.welcome.upcomingEvent.title}</strong>
              <p>
                {eventFormatter.format(
                  new Date(data.welcome.upcomingEvent.startsAt),
                )}
              </p>
            </>
          ) : (
            <>
              <strong>Tu agenda está libre</strong>
              <button onClick={() => onOpenModule("events")} type="button">
                Agregar evento →
              </button>
            </>
          )}
        </article>
      </div>

      <div className="welcome-content-grid">
        <section className="welcome-setup-card">
          <header>
            <div>
              <span className="eyebrow">Primeros pasos</span>
              <h3>
                {completedSetup === setupModules.length
                  ? "Tu Nexo está conectado"
                  : "Construye tu punto de partida"}
              </h3>
            </div>
            <div
              className="welcome-setup-progress"
              style={{
                background: `conic-gradient(var(--lime) ${setupPercent}%, #29292c 0)`,
              }}
            >
              <span>{setupPercent}%</span>
            </div>
          </header>
          <div className="welcome-setup-list">
            {setupModules.map((module) => {
              const completed = data?.welcome.setup[module.key] ?? false;
              return (
                <button
                  className={completed ? "welcome-step-complete" : ""}
                  key={module.key}
                  onClick={() => onOpenModule(module.key)}
                  type="button"
                >
                  <span
                    className="welcome-step-mark"
                    style={{ background: module.color }}
                  >
                    {completed ? "✓" : module.mark}
                  </span>
                  <span>
                    <strong>{module.label}</strong>
                    <small>
                      {completed ? "Listo" : module.description}
                    </small>
                  </span>
                  <i>→</i>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="welcome-insights">
          <section>
            <span className="eyebrow">Esta semana</span>
            <h3>Tu contexto crece</h3>
            <strong>{data?.overview.totalRecords ?? 0}</strong>
            <p>registros entre {data?.overview.activeModules ?? 0} módulos</p>
            <button onClick={onOpenProgress} type="button">
              Abrir progreso completo →
            </button>
          </section>
          <section>
            <span className="eyebrow">Conexión activa</span>
            <div className="welcome-connection">
              <i style={{ background: "#ff9e75" }}>C</i>
              <i style={{ background: "#78d6a3" }}>$</i>
              <span>
                <strong>Comidas × Finanzas</strong>
                {data?.meals.costCents
                  ? `${moneyFormatter.format(data.meals.costCents / 100)} conectados`
                  : "Registra costos para ver la relación"}
              </span>
            </div>
            <div className="welcome-connection">
              <i style={{ background: "#75d8e8" }}>KG</i>
              <i style={{ background: "#ff7f96" }}>+</i>
              <span>
                <strong>Gimnasio × Salud</strong>
                {data?.gym.workoutCount || data?.health.entryCount
                  ? `${data.gym.workoutCount} sesiones · ${data.health.entryCount} mediciones`
                  : "Entrena y mide tu recuperación"}
              </span>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
