"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "./api-client";

type Memory = {
  id: string;
  content: string;
  kind: "fact" | "event" | "preference" | "goal" | "pattern";
  module: string | null;
  source: "omi" | "observer" | "manual" | "derived";
  confidence: number;
  sensitivity: "normal" | "sensitive" | "restricted";
  userConfirmed: boolean;
  status: "active" | "superseded" | "rejected";
  lastSeenAt: string;
  occurrenceCount: number;
};

const kindLabels: Record<Memory["kind"], string> = {
  fact: "Hecho",
  event: "Evento",
  preference: "Preferencia",
  goal: "Objetivo",
  pattern: "Patrón",
};

const sourceLabels: Record<Memory["source"], string> = {
  omi: "Omi",
  observer: "Observador",
  manual: "Manual",
  derived: "Inferencia",
};

export function MemoryPanel({ sessionToken }: { sessionToken: string }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed">("all");

  useEffect(() => {
    let active = true;
    apiFetch("/api/memories", sessionToken)
      .then(async (response) => {
        const payload = (await response.json()) as {
          memories?: Memory[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "No fue posible cargar la memoria.");
        }
        if (active) setMemories(payload.memories ?? []);
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "No fue posible cargar la memoria.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionToken]);

  const visibleMemories = useMemo(
    () =>
      memories.filter((memory) => {
        if (filter === "pending") return !memory.userConfirmed;
        if (filter === "confirmed") return memory.userConfirmed;
        return true;
      }),
    [filter, memories],
  );
  const pendingCount = memories.filter((memory) => !memory.userConfirmed).length;

  async function review(memoryId: string, accepted: boolean): Promise<void> {
    setError(null);
    const response = await apiFetch(
      `/api/memories/${memoryId}/review`,
      sessionToken,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accepted }),
      },
    );
    const payload = (await response.json()) as {
      memory?: Memory;
      error?: string;
    };
    if (!response.ok || !payload.memory) {
      setError(payload.error ?? "No fue posible revisar la memoria.");
      return;
    }
    if (accepted) {
      setMemories((current) =>
        current.map((memory) =>
          memory.id === memoryId ? payload.memory! : memory,
        ),
      );
    } else {
      setMemories((current) =>
        current.filter((memory) => memory.id !== memoryId),
      );
    }
  }

  return (
    <section className="memory-workspace">
      <section className="memory-hero">
        <div>
          <span className="eyebrow">Contexto de largo plazo</span>
          <h2>Lo que Nexo sabe de ti.</h2>
          <p>
            Cada recuerdo conserva su fuente y nivel de confianza. Las
            inferencias no confirmadas esperan tu revisión.
          </p>
        </div>
        <div className="memory-summary">
          <strong>{memories.length}</strong>
          <span>recuerdos activos</span>
          <small>{pendingCount} pendientes de revisar</small>
        </div>
      </section>

      <div className="memory-toolbar">
        <div>
          {(["all", "pending", "confirmed"] as const).map((value) => (
            <button
              className={filter === value ? "memory-filter-active" : ""}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {value === "all"
                ? "Todos"
                : value === "pending"
                  ? `Pendientes (${pendingCount})`
                  : "Confirmados"}
            </button>
          ))}
        </div>
        <small>Los datos sensibles no se muestran en otras cuentas.</small>
      </div>

      {error ? <p className="memory-error">{error}</p> : null}
      {isLoading ? (
        <section className="memory-empty">Cargando tu contexto…</section>
      ) : visibleMemories.length === 0 ? (
        <section className="memory-empty">
          <span>◇</span>
          <h3>No hay recuerdos en esta vista</h3>
          <p>El Observador irá construyendo contexto con datos confirmados.</p>
        </section>
      ) : (
        <div className="memory-list">
          {visibleMemories.map((memory) => (
            <article className="memory-item" key={memory.id}>
              <header>
                <div>
                  <span>{kindLabels[memory.kind]}</span>
                  <span>{sourceLabels[memory.source]}</span>
                  {memory.module ? <span>{memory.module}</span> : null}
                  {memory.sensitivity !== "normal" ? (
                    <span className="memory-sensitive">Sensible</span>
                  ) : null}
                </div>
                <strong>{Math.round(memory.confidence * 100)}%</strong>
              </header>
              <p>{memory.content}</p>
              <footer>
                <small>
                  Visto {memory.occurrenceCount}{" "}
                  {memory.occurrenceCount === 1 ? "vez" : "veces"}
                </small>
                {memory.userConfirmed ? (
                  <span className="memory-confirmed">✓ Confirmado</span>
                ) : (
                  <div>
                    <button
                      onClick={() => void review(memory.id, false)}
                      type="button"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => void review(memory.id, true)}
                      type="button"
                    >
                      Confirmar
                    </button>
                  </div>
                )}
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
