"use client";

import { useState } from "react";

const starterQuestions = [
  "¿Qué debería priorizar hoy?",
  "¿Qué cambios importantes detectaste?",
  "Resume lo que sabes de mis objetivos.",
];

export function AssistantPanel({
  onOpenActivity,
  onOpenMemory,
}: {
  onOpenActivity: () => void;
  onOpenMemory: () => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <section className="assistant-workspace">
      <section className="assistant-hero">
        <span className="assistant-presence" aria-hidden="true">
          N
        </span>
        <div>
          <span className="eyebrow">Asistente personal</span>
          <h2>Pregunta con todo tu contexto.</h2>
          <p>
            Nexo podrá combinar tus registros, actividad y memorias confirmadas
            para responder sin convertir inferencias en hechos.
          </p>
        </div>
      </section>

      <section className="assistant-conversation">
        <div className="assistant-empty">
          <span>✦</span>
          <h3>El contexto ya se está construyendo</h3>
          <p>
            Revisa lo que Nexo observa y confirma su memoria. La conversación
            contextual se conectará sobre esa base.
          </p>
          <div>
            <button onClick={onOpenActivity} type="button">
              Abrir actividad
            </button>
            <button onClick={onOpenMemory} type="button">
              Revisar memoria
            </button>
          </div>
        </div>

        <div className="assistant-starters">
          {starterQuestions.map((question) => (
            <button
              key={question}
              onClick={() => setDraft(question)}
              type="button"
            >
              {question}
            </button>
          ))}
        </div>

        <div className="assistant-composer">
          <textarea
            aria-label="Mensaje para el asistente"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Pregúntale algo a Nexo…"
            rows={2}
            value={draft}
          />
          <button
            aria-label="Enviar mensaje"
            disabled
            title="La conversación contextual se conectará en la siguiente etapa."
            type="button"
          >
            ↑
          </button>
        </div>
        <small className="assistant-coming-soon">
          La conversación todavía no envía mensajes. Primero estamos asegurando
          que la memoria sea revisable y confiable.
        </small>
      </section>
    </section>
  );
}
