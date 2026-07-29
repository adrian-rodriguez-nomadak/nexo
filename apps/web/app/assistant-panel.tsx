"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useRef,
  useState,
} from "react";

import { apiFetch } from "./api-client";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  files?: string[];
};

type EncodedFile = {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
};

const starterQuestions = [
  "Ayúdame a priorizar mi día",
  "Resume estos archivos",
  "Encuentra patrones en mis registros",
];

const acceptedFiles = [
  ".pdf", ".doc", ".docx", ".odt", ".rtf",
  ".ppt", ".pptx", ".xls", ".xlsx", ".csv", ".tsv",
  ".txt", ".md", ".json", ".html", ".xml", ".eml", ".ics",
  ".js", ".ts", ".tsx", ".py", ".sql", ".css",
  ".png", ".jpg", ".jpeg", ".webp", ".gif",
].join(",");

function fileSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function readFile(file: File): Promise<EncodedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`No pude leer ${file.name}.`));
    reader.onload = () => {
      let dataUrl = String(reader.result);
      const detectedMimeType =
        /^data:([^;]+);base64,/.exec(dataUrl)?.[1] ?? "text/plain";
      const mimeType =
        file.type ||
        (file.name.toLowerCase().endsWith(".md")
          ? "text/markdown"
          : file.name.toLowerCase().endsWith(".json")
            ? "application/json"
            : "text/plain");
      if (mimeType !== detectedMimeType) {
        dataUrl = dataUrl.replace(/^data:[^;]+;/, `data:${mimeType};`);
      }
      resolve({
        name: file.name,
        mimeType,
        size: file.size,
        dataUrl,
      });
    };
    reader.readAsDataURL(file);
  });
}

export function AssistantPanel({
  displayName,
  sessionToken,
}: {
  displayName: string;
  sessionToken: string;
}) {
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<EncodedFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    setError(null);
    if (files.length + selected.length > 5) {
      setError("Puedes adjuntar hasta 5 archivos por mensaje.");
      return;
    }
    if (selected.some((file) => file.size > 8 * 1024 * 1024)) {
      setError("Cada archivo debe pesar menos de 8 MB.");
      return;
    }
    if (
      [...files, ...selected].reduce((sum, file) => sum + file.size, 0) >
      20 * 1024 * 1024
    ) {
      setError("Los archivos de un mensaje no pueden superar 20 MB en total.");
      return;
    }
    try {
      const encodedFiles = await Promise.all(selected.map(readFile));
      setFiles((current) => [...current, ...encodedFiles]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pude leer los archivos.");
    }
  }

  async function send(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const message = draft.trim() || (files.length ? "Analiza estos archivos." : "");
    if (!message || isSending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      files: files.map((file) => file.name),
    };
    const priorMessages = messages;
    const attachedFiles = files;
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setFiles([]);
    setError(null);
    setIsSending(true);

    try {
      const response = await apiFetch("/api/assistant/messages", sessionToken, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          files: attachedFiles,
          history: priorMessages.slice(-10).map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });
      const data = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok || !data.answer) {
        throw new Error(data.error ?? "Nexo no pudo responder.");
      }
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer!,
        },
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nexo no pudo responder.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="assistant-workspace assistant-workspace-live">
      <header className="assistant-live-header">
        <span className="assistant-presence" aria-hidden="true">N</span>
        <div>
          <span className="eyebrow">Tu asistente personal</span>
          <h2>Hola, {displayName.split(/\s+/)[0]}. ¿Qué hacemos?</h2>
          <p>Pregunta, comparte una imagen o trabaja con documentos y hojas de cálculo.</p>
        </div>
        <span className="assistant-private-badge">⌁ Privado</span>
      </header>

      <section className="assistant-conversation assistant-conversation-live">
        <div className="assistant-thread" aria-live="polite">
          {messages.length === 0 ? (
            <div className="assistant-empty-live">
              <span>✦</span>
              <h3>Todo empieza con una petición.</h3>
              <p>
                Nexo puede leer tu contexto y analizar PDF, documentos, presentaciones,
                hojas de cálculo, código e imágenes.
              </p>
              <div className="assistant-capabilities">
                <span>PDF y documentos</span>
                <span>Excel y CSV</span>
                <span>Imágenes</span>
                <span>Texto y código</span>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <article
                className={`assistant-message assistant-message-${message.role}`}
                key={message.id}
              >
                <span>{message.role === "assistant" ? "N" : "Tú"}</span>
                <div>
                  {message.files?.length ? (
                    <div className="assistant-message-files">
                      {message.files.map((name) => <small key={name}>▱ {name}</small>)}
                    </div>
                  ) : null}
                  <p>{message.content}</p>
                </div>
              </article>
            ))
          )}
          {isSending ? (
            <article className="assistant-message assistant-message-assistant">
              <span>N</span>
              <div className="assistant-thinking"><i /><i /><i /></div>
            </article>
          ) : null}
        </div>

        {messages.length === 0 ? (
          <div className="assistant-starters">
            {starterQuestions.map((question) => (
              <button key={question} onClick={() => setDraft(question)} type="button">
                {question}
              </button>
            ))}
          </div>
        ) : null}

        {files.length ? (
          <div className="assistant-file-tray">
            {files.map((file, index) => (
              <span key={`${file.name}-${index}`}>
                <i>▱</i>
                <span><strong>{file.name}</strong><small>{fileSize(file.size)}</small></span>
                <button
                  aria-label={`Quitar ${file.name}`}
                  onClick={() => setFiles((current) => current.filter((_, item) => item !== index))}
                  type="button"
                >×</button>
              </span>
            ))}
          </div>
        ) : null}

        {error ? <p className="assistant-error">{error}</p> : null}

        <form className="assistant-composer assistant-composer-live" onSubmit={send}>
          <input
            accept={acceptedFiles}
            aria-label="Seleccionar archivos"
            hidden
            multiple
            onChange={(event) => void chooseFiles(event)}
            ref={fileInput}
            type="file"
          />
          <button
            aria-label="Adjuntar archivos"
            className="assistant-attach"
            onClick={() => fileInput.current?.click()}
            title="Adjuntar archivos"
            type="button"
          >＋</button>
          <textarea
            aria-label="Mensaje para Nexo"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="Pídele algo a Nexo…"
            rows={2}
            value={draft}
          />
          <button
            aria-label="Enviar mensaje"
            className="assistant-send"
            disabled={isSending || (!draft.trim() && files.length === 0)}
            type="submit"
          >↑</button>
        </form>
        <small className="assistant-file-help">
          Hasta 5 archivos · 8 MB cada uno · Los originales no se guardan en Nexo
        </small>
      </section>
    </section>
  );
}
