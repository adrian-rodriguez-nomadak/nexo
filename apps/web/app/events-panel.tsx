"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiFetch } from "./api-client";

type NexoEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  createdAt: string;
};

type EventFilter = "upcoming" | "past" | "all";

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const longDateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "numeric",
  minute: "2-digit",
});

function toLocalInputValue(date: Date, dateOnly = false): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, dateOnly ? 10 : 16);
}

function initialStart(): Date {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date;
}

function localValueToIso(value: string, dateOnly: boolean): string | null {
  if (!value) return null;
  const date = new Date(dateOnly ? `${value}T00:00:00` : value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function sameLocalDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function eventTimeLabel(event: NexoEvent): string {
  if (event.allDay) return "Todo el día";
  const startsAt = new Date(event.startsAt);
  if (!event.endsAt) return timeFormatter.format(startsAt);
  return `${timeFormatter.format(startsAt)} – ${timeFormatter.format(
    new Date(event.endsAt),
  )}`;
}

function eventDateLabel(event: NexoEvent, referenceDate: Date): string {
  const startsAt = new Date(event.startsAt);
  const today = referenceDate;
  const tomorrow = new Date(referenceDate);
  tomorrow.setDate(today.getDate() + 1);

  if (sameLocalDay(startsAt, today)) return "Hoy";
  if (sameLocalDay(startsAt, tomorrow)) return "Mañana";
  return longDateFormatter.format(startsAt);
}

export function EventsPanel({
  onCountChange,
  sessionToken,
}: {
  onCountChange: (count: number) => void;
  sessionToken: string;
}) {
  const [events, setEvents] = useState<NexoEvent[]>([]);
  const [filter, setFilter] = useState<EventFilter>("upcoming");
  const [currentTime, setCurrentTime] = useState(Date.now);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startsAt, setStartsAt] = useState(() =>
    toLocalInputValue(initialStart()),
  );
  const [endsAt, setEndsAt] = useState(() => {
    const start = initialStart();
    return toLocalInputValue(new Date(start.getTime() + 60 * 60 * 1000));
  });

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadEvents = useCallback(async () => {
    const response = await apiFetch("/api/events", sessionToken);
    const data = (await response.json()) as {
      events?: NexoEvent[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? "No fue posible cargar Eventos.");
    }

    const nextEvents = data.events ?? [];
    setEvents(nextEvents);
    onCountChange(nextEvents.length);
  }, [onCountChange, sessionToken]);

  useEffect(() => {
    let active = true;

    async function initializeEvents() {
      try {
        const response = await apiFetch("/api/events", sessionToken);
        const data = (await response.json()) as {
          events?: NexoEvent[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "No fue posible cargar Eventos.");
        }
        if (!active) return;

        const nextEvents = data.events ?? [];
        setEvents(nextEvents);
        onCountChange(nextEvents.length);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "No fue posible cargar Eventos.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void initializeEvents();
    return () => {
      active = false;
    };
  }, [onCountChange, sessionToken]);

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => new Date(event.startsAt).getTime() >= currentTime)
        .sort(
          (first, second) =>
            new Date(first.startsAt).getTime() -
            new Date(second.startsAt).getTime(),
        ),
    [currentTime, events],
  );
  const pastEvents = useMemo(
    () =>
      events
        .filter((event) => new Date(event.startsAt).getTime() < currentTime)
        .sort(
          (first, second) =>
            new Date(second.startsAt).getTime() -
            new Date(first.startsAt).getTime(),
        ),
    [currentTime, events],
  );
  const visibleEvents =
    filter === "upcoming"
      ? upcomingEvents
      : filter === "past"
        ? pastEvents
        : [...upcomingEvents, ...pastEvents];
  const currentDate = useMemo(() => new Date(currentTime), [currentTime]);
  const todayCount = events.filter((event) =>
    sameLocalDay(new Date(event.startsAt), currentDate),
  ).length;
  const nextEvent = upcomingEvents[0] ?? null;

  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || title.trim().length < 2) return;

    const normalizedStartsAt = localValueToIso(startsAt, allDay);
    const normalizedEndsAt = allDay
      ? null
      : localValueToIso(endsAt, false);
    if (!normalizedStartsAt) {
      setError("Selecciona una fecha válida.");
      return;
    }
    if (
      normalizedEndsAt &&
      Date.parse(normalizedEndsAt) <= Date.parse(normalizedStartsAt)
    ) {
      setError("La hora de término debe ser posterior al inicio.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await apiFetch("/api/events", sessionToken, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          location,
          startsAt: normalizedStartsAt,
          endsAt: normalizedEndsAt,
          allDay,
        }),
      });
      const data = (await response.json()) as {
        event?: NexoEvent;
        error?: string;
      };
      if (!response.ok || !data.event) {
        throw new Error(data.error ?? "No fue posible guardar el evento.");
      }

      setTitle("");
      setDescription("");
      setLocation("");
      setFilter("upcoming");
      await loadEvents();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar el evento.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeEvent(id: string) {
    const previous = events;
    const nextEvents = events.filter((event) => event.id !== id);
    setEvents(nextEvents);
    onCountChange(nextEvents.length);
    setError(null);

    try {
      const response = await apiFetch(`/api/events/${id}`, sessionToken, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
    } catch {
      setEvents(previous);
      onCountChange(previous.length);
      setError("No fue posible eliminar el evento.");
    }
  }

  function changeAllDay(nextAllDay: boolean) {
    setAllDay(nextAllDay);
    const currentStart = new Date(startsAt);
    const safeStart = Number.isFinite(currentStart.getTime())
      ? currentStart
      : initialStart();
    if (nextAllDay) {
      setStartsAt(toLocalInputValue(safeStart, true));
      return;
    }

    const nextStart = new Date(`${startsAt}T09:00:00`);
    setStartsAt(toLocalInputValue(nextStart));
    setEndsAt(
      toLocalInputValue(new Date(nextStart.getTime() + 60 * 60 * 1000)),
    );
  }

  return (
    <section className="events-workspace">
      <div className="events-overview">
        <article className="next-event-card">
          <span className="events-kicker">Siguiente evento</span>
          {nextEvent ? (
            <>
              <strong>{nextEvent.title}</strong>
              <p>
                {eventDateLabel(nextEvent, currentDate)} ·{" "}
                {eventTimeLabel(nextEvent)}
              </p>
              {nextEvent.location ? <small>{nextEvent.location}</small> : null}
            </>
          ) : (
            <>
              <strong>Tu agenda está libre</strong>
              <p>Crea un evento para comenzar a ordenar tu tiempo.</p>
            </>
          )}
        </article>
        <article className="events-stat-card">
          <span>Próximos</span>
          <strong>{upcomingEvents.length}</strong>
          <p>eventos por venir</p>
        </article>
        <article className="events-stat-card">
          <span>Hoy</span>
          <strong>{todayCount}</strong>
          <p>compromisos del día</p>
        </article>
      </div>

      {error ? (
        <div className="events-alert" role="alert">
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

      <div className="events-content-grid">
        <form className="event-form-card" onSubmit={submitEvent}>
          <div className="events-card-heading">
            <div>
              <span className="eyebrow">Nuevo</span>
              <h2>Agregar evento</h2>
            </div>
            <label className="all-day-control">
              <input
                checked={allDay}
                onChange={(event) => changeAllDay(event.target.checked)}
                type="checkbox"
              />
              Todo el día
            </label>
          </div>

          <div className="event-fields">
            <label>
              <span>Título</span>
              <input
                maxLength={100}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ej. Cita médica"
                required
                value={title}
              />
            </label>
            <div className="event-field-row">
              <label>
                <span>Inicio</span>
                <input
                  onChange={(event) => setStartsAt(event.target.value)}
                  required
                  type={allDay ? "date" : "datetime-local"}
                  value={startsAt}
                />
              </label>
              {!allDay ? (
                <label>
                  <span>Término</span>
                  <input
                    onChange={(event) => setEndsAt(event.target.value)}
                    type="datetime-local"
                    value={endsAt}
                  />
                </label>
              ) : null}
            </div>
            <label>
              <span>Lugar</span>
              <input
                maxLength={160}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Opcional"
                value={location}
              />
            </label>
            <label>
              <span>Detalles</span>
              <textarea
                maxLength={1000}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Notas, preparación o información importante"
                rows={4}
                value={description}
              />
            </label>
            <button
              className="event-primary-button"
              disabled={isSaving || title.trim().length < 2}
              type="submit"
            >
              {isSaving ? "Guardando…" : "Guardar evento"}
            </button>
          </div>
        </form>

        <section className="events-list-card">
          <div className="events-card-heading">
            <div>
              <span className="eyebrow">Agenda</span>
              <h2>Mis eventos</h2>
            </div>
            <div className="events-filter" aria-label="Filtrar eventos">
              {(
                [
                  ["upcoming", "Próximos"],
                  ["past", "Pasados"],
                  ["all", "Todos"],
                ] as const
              ).map(([value, label]) => (
                <button
                  className={filter === value ? "events-filter-active" : ""}
                  key={value}
                  onClick={() => setFilter(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="events-list" aria-live="polite">
            {isLoading ? (
              <div className="events-empty">
                <span>···</span>
                <strong>Abriendo tu agenda</strong>
              </div>
            ) : visibleEvents.length === 0 ? (
              <div className="events-empty">
                <span>23</span>
                <strong>No hay eventos en esta vista</strong>
                <p>Los eventos que agregues aparecerán aquí.</p>
              </div>
            ) : (
              visibleEvents.map((event) => {
                const startsAtDate = new Date(event.startsAt);
                return (
                  <article className="event-item" key={event.id}>
                    <time
                      className="event-date-badge"
                      dateTime={event.startsAt}
                    >
                      <span>
                        {dateFormatter
                          .formatToParts(startsAtDate)
                          .find((part) => part.type === "month")?.value ?? ""}
                      </span>
                      <strong>{startsAtDate.getDate()}</strong>
                    </time>
                    <div className="event-item-content">
                      <div>
                        <strong>{event.title}</strong>
                        <span>{eventTimeLabel(event)}</span>
                      </div>
                      <p>{eventDateLabel(event, currentDate)}</p>
                      {event.location ? <small>⌖ {event.location}</small> : null}
                      {event.description ? (
                        <small>{event.description}</small>
                      ) : null}
                    </div>
                    <button
                      aria-label={`Eliminar evento: ${event.title}`}
                      className="delete-button"
                      onClick={() => void removeEvent(event.id)}
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
    </section>
  );
}
