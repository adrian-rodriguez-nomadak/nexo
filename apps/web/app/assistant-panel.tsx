"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { apiFetch } from "./api-client";
import {
  AssistantVisuals,
  type AssistantVisualBlock,
} from "./assistant-visuals";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  files?: string[];
  blocks?: AssistantVisualBlock[];
};

type EncodedFile = {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
};

const starterQuestions = [
  "Organiza lo que tengo pendiente esta semana",
  "Recuerda que quiero correr un maratón",
  "Gasté $300 en Uber desde mi cuenta BBVA",
  "Ayúdame a aterrizar una idea nueva",
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
  const [isRestoringHistory, setIsRestoringHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isStartingNewChat, setIsStartingNewChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const threadEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void apiFetch("/api/assistant/messages", sessionToken)
      .then(async (response) => {
        const data = (await response.json()) as {
          messages?: Array<{
            id: string;
            role: "user" | "assistant";
            content: string;
            attachments?: string[];
            blocks?: AssistantVisualBlock[];
          }>;
        };
        if (active && response.ok && Array.isArray(data.messages)) {
          setMessages(
            data.messages.map((message) => ({
              id: message.id,
              role: message.role,
              content: message.content,
              files: message.attachments,
              blocks: message.blocks,
            })),
          );
        }
      })
      .catch(() => {
        // El chat sigue disponible aunque falle la restauración del historial.
      })
      .finally(() => {
        if (active) setIsRestoringHistory(false);
      });
    return () => {
      active = false;
    };
  }, [sessionToken]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({
      behavior: messages.length > 1 ? "smooth" : "auto",
      block: "end",
    });
  }, [messages, isSending]);

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

  async function startNewChat() {
    if (
      messages.length > 0 &&
      !window.confirm(
        "¿Iniciar un chat nuevo? Se borrará esta conversación, pero Nexo conservará tus memorias y registros.",
      )
    ) {
      return;
    }
    setIsStartingNewChat(true);
    setError(null);
    try {
      const response = await apiFetch("/api/assistant/messages", sessionToken, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No pude iniciar un chat nuevo.");
      }
      setMessages([]);
      setDraft("");
      setFiles([]);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No pude iniciar un chat nuevo.",
      );
    } finally {
      setIsStartingNewChat(false);
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
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          history: priorMessages.slice(-10).map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });
      const data = (await response.json()) as {
        answer?: string;
        error?: string;
        assistantMessage?: { id?: string };
        blocks?: AssistantVisualBlock[];
      };
      if (!response.ok || !data.answer) {
        throw new Error(data.error ?? "Nexo no pudo responder.");
      }
      setMessages((current) => [
        ...current,
        {
          id: data.assistantMessage?.id ?? crypto.randomUUID(),
          role: "assistant",
          content: data.answer!,
          blocks: data.blocks,
        },
      ]);
    } catch (caught) {
      setMessages(priorMessages);
      setDraft(message);
      setFiles(attachedFiles);
      setError(caught instanceof Error ? caught.message : "Nexo no pudo responder.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="assistant-workspace assistant-workspace-live chat-only-workspace">
      <header className="assistant-live-header">
        <span className="assistant-presence" aria-hidden="true">N</span>
        <div>
          <span className="eyebrow">Tu asistente personal</span>
          <h2>
            {messages.length
              ? "¿Qué hacemos ahora?"
              : `Hola, ${displayName.split(/\s+/)[0]}. ¿Qué tienes en mente?`}
          </h2>
          <p>Escribe con naturalidad. Nexo se encarga de conectar el contexto.</p>
        </div>
        <button
          className="assistant-new-chat"
          disabled={isSending || isStartingNewChat}
          onClick={() => void startNewChat()}
          type="button"
        >
          {isStartingNewChat ? "Iniciando…" : "＋ Nuevo chat"}
        </button>
      </header>

      <section className="assistant-conversation assistant-conversation-live">
        <div className="assistant-thread" aria-live="polite">
          {isRestoringHistory ? (
            <div className="assistant-restoring" role="status">
              <i /><i /><i />
              <span>Recuperando tu conversación</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="assistant-empty-live">
              <div className="assistant-empty-orbit" aria-hidden="true">
                <i /><i /><i />
                <span>N</span>
              </div>
              <h3>No necesitas ordenar nada primero.</h3>
              <p>
                Cuéntame qué pasó, qué necesitas o qué quieres recordar. Puedo
                relacionar personas, fechas, dinero, proyectos, hábitos e ideas
                dentro de la misma conversación.
              </p>
              <div className="assistant-capabilities">
                <span>Entiende</span>
                <b>→</b>
                <span>Conecta</span>
                <b>→</b>
                <span>Recuerda</span>
                <b>→</b>
                <span>Actúa</span>
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
                  {message.role === "assistant" ? (
                    <AssistantVisuals blocks={message.blocks} />
                  ) : null}
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
          <div ref={threadEnd} />
        </div>

        {!isRestoringHistory && messages.length === 0 ? (
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
          ><span aria-hidden="true">＋</span></button>
          <textarea
            aria-label="Mensaje para Nexo"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="Cuéntale algo a Nexo…"
            rows={2}
            value={draft}
          />
          <button
            aria-label="Enviar mensaje"
            className="assistant-send"
            disabled={isSending || (!draft.trim() && files.length === 0)}
            type="submit"
          ><span aria-hidden="true">↑</span></button>
        </form>
        <small className="assistant-file-help">
          Nexo puede equivocarse. Confirma los datos importantes antes de actuar.
        </small>
      </section>
    </section>
  );
}
