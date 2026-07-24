"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiFetch } from "./api-client";

type NexoNote = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

const updatedFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function parseTags(value: string): string[] | null {
  const tags = value
    .split(",")
    .map((tag) => tag.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  if (tags.length > 8 || tags.some((tag) => tag.length > 30)) return null;

  const seen = new Set<string>();
  return tags.filter((tag) => {
    const key = tag.toLocaleLowerCase("es-MX");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function NotesPanel({
  onCountChange,
  sessionToken,
}: {
  onCountChange: (count: number) => void;
  sessionToken: string;
}) {
  const [notes, setNotes] = useState<NexoNote[]>([]);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    const response = await apiFetch("/api/notes", sessionToken);
    const data = (await response.json()) as {
      notes?: NexoNote[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? "No fue posible cargar Notas.");
    }

    const nextNotes = data.notes ?? [];
    setNotes(nextNotes);
    onCountChange(nextNotes.length);
  }, [onCountChange, sessionToken]);

  useEffect(() => {
    let active = true;

    async function initializeNotes() {
      try {
        const response = await apiFetch("/api/notes", sessionToken);
        const data = (await response.json()) as {
          notes?: NexoNote[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "No fue posible cargar Notas.");
        }
        if (!active) return;

        const nextNotes = data.notes ?? [];
        setNotes(nextNotes);
        onCountChange(nextNotes.length);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "No fue posible cargar Notas.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void initializeNotes();
    return () => {
      active = false;
    };
  }, [onCountChange, sessionToken]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of notes) {
      for (const tag of note.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort(
      ([firstTag, firstCount], [secondTag, secondCount]) =>
        secondCount - firstCount || firstTag.localeCompare(secondTag, "es-MX"),
    );
  }, [notes]);

  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const visibleNotes = useMemo(
    () =>
      notes.filter((note) => {
        const matchesTag =
          activeTag === "all" || note.tags.includes(activeTag);
        const matchesSearch =
          !normalizedSearch ||
          note.title.toLocaleLowerCase("es-MX").includes(normalizedSearch) ||
          note.content.toLocaleLowerCase("es-MX").includes(normalizedSearch) ||
          note.tags.some((tag) =>
            tag.toLocaleLowerCase("es-MX").includes(normalizedSearch),
          );
        return matchesTag && matchesSearch;
      }),
    [activeTag, normalizedSearch, notes],
  );

  function clearEditor() {
    setEditingId(null);
    setTitle("");
    setContent("");
    setTagsInput("");
    setIsPinned(false);
  }

  function editNote(note: NexoNote) {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setTagsInput(note.tags.join(", "));
    setIsPinned(note.isPinned);
    setError(null);
  }

  async function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || title.trim().length < 2 || !content.trim()) return;

    const tags = parseTags(tagsInput);
    if (!tags) {
      setError("Usa máximo 8 etiquetas de hasta 30 caracteres.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await apiFetch(
        editingId ? `/api/notes/${editingId}` : "/api/notes",
        sessionToken,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title,
            content,
            tags,
            isPinned,
          }),
        },
      );
      const data = (await response.json()) as {
        note?: NexoNote;
        error?: string;
      };
      if (!response.ok || !data.note) {
        throw new Error(data.error ?? "No fue posible guardar la nota.");
      }

      clearEditor();
      await loadNotes();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar la nota.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePinned(note: NexoNote) {
    const previous = notes;
    const nextPinned = !note.isPinned;
    setNotes((current) =>
      current
        .map((item) =>
          item.id === note.id ? { ...item, isPinned: nextPinned } : item,
        )
        .sort(
          (first, second) =>
            Number(second.isPinned) - Number(first.isPinned) ||
            Date.parse(second.updatedAt) - Date.parse(first.updatedAt),
        ),
    );
    setError(null);

    try {
      const response = await apiFetch(`/api/notes/${note.id}`, sessionToken, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: note.title,
          content: note.content,
          tags: note.tags,
          isPinned: nextPinned,
        }),
      });
      if (!response.ok) throw new Error();
      await loadNotes();
    } catch {
      setNotes(previous);
      setError("No fue posible cambiar el marcador de la nota.");
    }
  }

  async function removeNote(id: string) {
    const previous = notes;
    const nextNotes = notes.filter((note) => note.id !== id);
    setNotes(nextNotes);
    onCountChange(nextNotes.length);
    if (editingId === id) clearEditor();
    setError(null);

    try {
      const response = await apiFetch(`/api/notes/${id}`, sessionToken, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
    } catch {
      setNotes(previous);
      onCountChange(previous.length);
      setError("No fue posible eliminar la nota.");
    }
  }

  const pinnedCount = notes.filter((note) => note.isPinned).length;

  return (
    <section className="notes-workspace">
      <div className="notes-overview">
        <article className="notes-hero-card">
          <span className="notes-kicker">Memoria personal</span>
          <strong>Todo lo importante, fácil de encontrar.</strong>
          <p>Guarda ideas, listas, decisiones y contexto sin perder el hilo.</p>
        </article>
        <article className="notes-stat-card">
          <span>Notas</span>
          <strong>{notes.length}</strong>
          <p>registros guardados</p>
        </article>
        <article className="notes-stat-card">
          <span>Fijadas</span>
          <strong>{pinnedCount}</strong>
          <p>siempre a la vista</p>
        </article>
        <article className="notes-stat-card">
          <span>Etiquetas</span>
          <strong>{tagCounts.length}</strong>
          <p>formas de organizar</p>
        </article>
      </div>

      {error ? (
        <div className="notes-alert" role="alert">
          {error}
          <button
            aria-label="Cerrar aviso"
            onClick={() => setError(null)}
            type="button"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="notes-content-grid">
        <form className="note-editor-card" onSubmit={submitNote}>
          <div className="notes-card-heading">
            <div>
              <span className="eyebrow">
                {editingId ? "Editando" : "Nueva"}
              </span>
              <h2>{editingId ? "Actualizar nota" : "Crear nota"}</h2>
            </div>
            {editingId ? (
              <button
                className="note-cancel-button"
                onClick={clearEditor}
                type="button"
              >
                Cancelar
              </button>
            ) : null}
          </div>

          <div className="note-fields">
            <label>
              <span>Título</span>
              <input
                maxLength={120}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ej. Ideas para el nuevo proyecto"
                required
                value={title}
              />
            </label>
            <label>
              <span>Contenido</span>
              <textarea
                maxLength={10_000}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Escribe aquí todo el contexto…"
                required
                rows={11}
                value={content}
              />
            </label>
            <label>
              <span>Etiquetas</span>
              <input
                maxLength={255}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="trabajo, ideas, personal"
                value={tagsInput}
              />
              <small>Sepáralas con comas. Máximo 8.</small>
            </label>
            <label className="pin-control">
              <input
                checked={isPinned}
                onChange={(event) => setIsPinned(event.target.checked)}
                type="checkbox"
              />
              Fijar esta nota
            </label>
            <button
              className="note-primary-button"
              disabled={
                isSaving || title.trim().length < 2 || !content.trim()
              }
              type="submit"
            >
              {isSaving
                ? "Guardando…"
                : editingId
                  ? "Guardar cambios"
                  : "Guardar nota"}
            </button>
          </div>
        </form>

        <section className="notes-library-card">
          <div className="notes-library-header">
            <div>
              <span className="eyebrow">Biblioteca</span>
              <h2>Mis notas</h2>
            </div>
            <label className="notes-search">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Buscar notas"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar notas…"
                type="search"
                value={search}
              />
            </label>
          </div>

          <div className="notes-tags-filter" aria-label="Filtrar por etiqueta">
            <button
              className={activeTag === "all" ? "notes-tag-active" : ""}
              onClick={() => setActiveTag("all")}
              type="button"
            >
              Todas <span>{notes.length}</span>
            </button>
            {tagCounts.map(([tag, count]) => (
              <button
                className={activeTag === tag ? "notes-tag-active" : ""}
                key={tag}
                onClick={() => setActiveTag(tag)}
                type="button"
              >
                {tag} <span>{count}</span>
              </button>
            ))}
          </div>

          <div className="notes-grid" aria-live="polite">
            {isLoading ? (
              <div className="notes-empty">
                <span>···</span>
                <strong>Abriendo tu biblioteca</strong>
              </div>
            ) : visibleNotes.length === 0 ? (
              <div className="notes-empty">
                <span>N</span>
                <strong>No encontramos notas</strong>
                <p>Crea una nota o cambia los filtros de búsqueda.</p>
              </div>
            ) : (
              visibleNotes.map((note) => (
                <article
                  className={`note-card ${note.isPinned ? "note-card-pinned" : ""}`}
                  key={note.id}
                >
                  <div className="note-card-top">
                    <span>{note.isPinned ? "Fijada" : "Nota"}</span>
                    <button
                      aria-label={
                        note.isPinned ? "Dejar de fijar nota" : "Fijar nota"
                      }
                      className="note-pin-button"
                      onClick={() => void togglePinned(note)}
                      type="button"
                    >
                      {note.isPinned ? "◆" : "◇"}
                    </button>
                  </div>
                  <h3>{note.title}</h3>
                  <p>{note.content}</p>
                  {note.tags.length ? (
                    <div className="note-tags">
                      {note.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setActiveTag(tag)}
                          type="button"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <footer>
                    <time dateTime={note.updatedAt}>
                      {updatedFormatter.format(new Date(note.updatedAt))}
                    </time>
                    <span>
                      <button onClick={() => editNote(note)} type="button">
                        Editar
                      </button>
                      <button
                        className="note-delete-button"
                        onClick={() => void removeNote(note.id)}
                        type="button"
                      >
                        Eliminar
                      </button>
                    </span>
                  </footer>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
