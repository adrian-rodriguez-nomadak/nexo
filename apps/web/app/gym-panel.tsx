"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiFetch } from "./api-client";

type ExerciseKind = "strength" | "cardio" | "mobility";
type GymFilter = "week" | "month" | "all";

type GymExercise = {
  id: string;
  name: string;
  kind: ExerciseKind;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  distanceKm: number | null;
  durationMinutes: number | null;
  notes: string | null;
};

type GymWorkout = {
  id: string;
  title: string;
  notes: string | null;
  durationMinutes: number;
  exercises: GymExercise[];
  trainedAt: string;
  createdAt: string;
};

type ExerciseDraft = {
  name: string;
  kind: ExerciseKind;
  sets: string;
  reps: string;
  weightKg: string;
  distanceKm: string;
  durationMinutes: string;
  notes: string;
};

type ExerciseCatalogItem = {
  id: string;
  name: string;
  category: string | null;
  source: "wger";
};

const kindLabels: Record<ExerciseKind, string> = {
  strength: "Fuerza",
  cardio: "Cardio",
  mobility: "Movilidad",
};

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const sessionDateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function toLocalInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function emptyExercise(kind: ExerciseKind = "strength"): ExerciseDraft {
  return {
    name: "",
    kind,
    sets: kind === "strength" ? "3" : "",
    reps: kind === "strength" ? "10" : "",
    weightKg: "",
    distanceKm: "",
    durationMinutes: "",
    notes: "",
  };
}

function optionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function workoutTitleFromDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? `Sesión · ${sessionDateFormatter.format(date)}`
    : "Sesión";
}

function workoutVolume(workout: GymWorkout): number {
  return workout.exercises.reduce((total, exercise) => {
    if (
      exercise.kind !== "strength" ||
      exercise.sets === null ||
      exercise.reps === null ||
      exercise.weightKg === null
    ) {
      return total;
    }
    return total + exercise.sets * exercise.reps * exercise.weightKg;
  }, 0);
}

function exerciseDetail(exercise: GymExercise): string {
  if (exercise.kind === "strength") {
    const base =
      exercise.sets && exercise.reps
        ? `${exercise.sets} × ${exercise.reps}`
        : "Sin series";
    return exercise.weightKg === null
      ? base
      : `${base} · ${exercise.weightKg} kg`;
  }
  if (exercise.kind === "cardio") {
    return [
      exercise.distanceKm === null ? null : `${exercise.distanceKm} km`,
      exercise.durationMinutes === null
        ? null
        : `${exercise.durationMinutes} min`,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return exercise.durationMinutes === null
    ? "Trabajo libre"
    : `${exercise.durationMinutes} min`;
}

export function GymPanel({
  onCountChange,
  sessionToken,
}: {
  onCountChange: (count: number) => void;
  sessionToken: string;
}) {
  const [workouts, setWorkouts] = useState<GymWorkout[]>([]);
  const [filter, setFilter] = useState<GymFilter>("week");
  const [currentTime] = useState(Date.now);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [catalogLoadingIndex, setCatalogLoadingIndex] = useState<number | null>(
    null,
  );
  const [catalogResults, setCatalogResults] = useState<
    Record<number, ExerciseCatalogItem[]>
  >({});
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [trainedAt, setTrainedAt] = useState(() =>
    toLocalInputValue(new Date()),
  );
  const [exercises, setExercises] = useState<ExerciseDraft[]>([
    emptyExercise(),
  ]);

  const loadWorkouts = useCallback(async () => {
    const response = await apiFetch("/api/gym", sessionToken);
    const data = (await response.json()) as {
      workouts?: GymWorkout[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? "No fue posible cargar Gimnasio.");
    }

    const nextWorkouts = data.workouts ?? [];
    setWorkouts(nextWorkouts);
    onCountChange(nextWorkouts.length);
  }, [onCountChange, sessionToken]);

  useEffect(() => {
    let active = true;

    async function initializeGym() {
      try {
        const response = await apiFetch("/api/gym", sessionToken);
        const data = (await response.json()) as {
          workouts?: GymWorkout[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "No fue posible cargar Gimnasio.");
        }
        if (!active) return;

        const nextWorkouts = data.workouts ?? [];
        setWorkouts(nextWorkouts);
        onCountChange(nextWorkouts.length);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "No fue posible cargar Gimnasio.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void initializeGym();
    return () => {
      active = false;
    };
  }, [onCountChange, sessionToken]);

  const weekStart = useMemo(() => {
    const value = new Date(currentTime);
    value.setDate(value.getDate() - 6);
    value.setHours(0, 0, 0, 0);
    return value.getTime();
  }, [currentTime]);
  const monthStart = useMemo(() => {
    const value = new Date(currentTime);
    value.setDate(value.getDate() - 29);
    value.setHours(0, 0, 0, 0);
    return value.getTime();
  }, [currentTime]);
  const weekWorkouts = useMemo(
    () =>
      workouts.filter(
        (workout) => new Date(workout.trainedAt).getTime() >= weekStart,
      ),
    [weekStart, workouts],
  );
  const visibleWorkouts = useMemo(() => {
    if (filter === "week") return weekWorkouts;
    if (filter === "month") {
      return workouts.filter(
        (workout) => new Date(workout.trainedAt).getTime() >= monthStart,
      );
    }
    return workouts;
  }, [filter, monthStart, weekWorkouts, workouts]);
  const weekMinutes = weekWorkouts.reduce(
    (total, workout) => total + workout.durationMinutes,
    0,
  );
  const weekVolume = weekWorkouts.reduce(
    (total, workout) => total + workoutVolume(workout),
    0,
  );
  const personalBest = workouts.reduce(
    (maximum, workout) =>
      Math.max(
        maximum,
        ...workout.exercises.map((exercise) => exercise.weightKg ?? 0),
      ),
    0,
  );
  const generatedTitle = workoutTitleFromDate(trainedAt);

  function updateExercise(
    index: number,
    field: keyof ExerciseDraft,
    value: string,
  ) {
    setExercises((current) =>
      current.map((exercise, exerciseIndex) => {
        if (exerciseIndex !== index) return exercise;
        if (field === "kind") {
          return {
            ...emptyExercise(value as ExerciseKind),
            name: exercise.name,
            notes: exercise.notes,
          };
        }
        return { ...exercise, [field]: value };
      }),
    );
  }

  function addExercise() {
    setCatalogResults({});
    setExercises((current) =>
      current.length < 30 ? [...current, emptyExercise()] : current,
    );
  }

  function removeExercise(index: number) {
    setCatalogResults({});
    setExercises((current) =>
      current.length > 1
        ? current.filter((_, exerciseIndex) => exerciseIndex !== index)
        : current,
    );
  }

  async function searchExercise(index: number) {
    const query = exercises[index]?.name.trim() ?? "";
    if (query.length < 2 || catalogLoadingIndex !== null) {
      setError("Escribe al menos dos caracteres para buscar.");
      return;
    }

    setCatalogLoadingIndex(index);
    setError(null);
    try {
      const response = await apiFetch(
        `/api/gym/catalog?q=${encodeURIComponent(query)}`,
        sessionToken,
      );
      const data = (await response.json()) as {
        exercises?: ExerciseCatalogItem[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "No fue posible buscar ejercicios.");
      }
      setCatalogResults((current) => ({
        ...current,
        [index]: data.exercises ?? [],
      }));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible buscar ejercicios.",
      );
    } finally {
      setCatalogLoadingIndex(null);
    }
  }

  function chooseExercise(index: number, item: ExerciseCatalogItem) {
    updateExercise(index, "name", item.name);
    setCatalogResults((current) => ({ ...current, [index]: [] }));
  }

  async function submitWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const parsedDuration = Number(durationMinutes);
    const trainedDate = new Date(trainedAt);
    const invalidExercise = exercises.some((exercise) => {
      if (exercise.name.trim().length < 2) return true;
      if (
        exercise.kind === "strength" &&
        (!Number(exercise.sets) || !Number(exercise.reps))
      ) {
        return true;
      }
      return (
        exercise.kind === "cardio" &&
        !Number(exercise.distanceKm) &&
        !Number(exercise.durationMinutes)
      );
    });
    if (
      !Number.isSafeInteger(parsedDuration) ||
      parsedDuration < 1 ||
      invalidExercise ||
      !Number.isFinite(trainedDate.getTime())
    ) {
      setError(
        "Completa el entrenamiento y los datos necesarios de cada ejercicio.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await apiFetch("/api/gym", sessionToken, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: generatedTitle,
          notes,
          durationMinutes: parsedDuration,
          trainedAt: trainedDate.toISOString(),
          exercises: exercises.map((exercise) => ({
            name: exercise.name,
            kind: exercise.kind,
            sets: optionalNumber(exercise.sets),
            reps: optionalNumber(exercise.reps),
            weightKg: optionalNumber(exercise.weightKg),
            distanceKm: optionalNumber(exercise.distanceKm),
            durationMinutes: optionalNumber(exercise.durationMinutes),
            notes: exercise.notes,
          })),
        }),
      });
      const data = (await response.json()) as {
        workout?: GymWorkout;
        error?: string;
      };
      if (!response.ok || !data.workout) {
        throw new Error(
          data.error ?? "No fue posible guardar el entrenamiento.",
        );
      }

      setNotes("");
      setDurationMinutes("60");
      setTrainedAt(toLocalInputValue(new Date()));
      setExercises([emptyExercise()]);
      setFilter("week");
      await loadWorkouts();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar el entrenamiento.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeWorkout(id: string) {
    const previous = workouts;
    const nextWorkouts = workouts.filter((workout) => workout.id !== id);
    setWorkouts(nextWorkouts);
    onCountChange(nextWorkouts.length);
    setError(null);

    try {
      const response = await apiFetch(`/api/gym/${id}`, sessionToken, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
    } catch {
      setWorkouts(previous);
      onCountChange(previous.length);
      setError("No fue posible eliminar el entrenamiento.");
    }
  }

  return (
    <section className="gym-workspace">
      <div className="gym-overview">
        <article className="gym-hero-card">
          <span className="gym-kicker">Progreso real</span>
          <strong>Entrena. Registra. Mejora.</strong>
          <p>
            Guarda la sesión completa y deja que el volumen cuente la historia.
          </p>
        </article>
        <article className="gym-stat-card">
          <span>Esta semana</span>
          <strong>{weekWorkouts.length}</strong>
          <p>sesiones terminadas</p>
        </article>
        <article className="gym-stat-card">
          <span>Tiempo</span>
          <strong>{weekMinutes}</strong>
          <p>minutos entrenados</p>
        </article>
        <article className="gym-stat-card">
          <span>Volumen</span>
          <strong>{Math.round(weekVolume).toLocaleString("es-MX")}</strong>
          <p>kg movidos esta semana</p>
        </article>
        <article className="gym-stat-card">
          <span>Peso máximo</span>
          <strong>{personalBest} kg</strong>
          <p>mejor carga registrada</p>
        </article>
      </div>

      {error ? (
        <div className="gym-alert" role="alert">
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

      <div className="gym-content-grid">
        <form className="gym-editor-card" onSubmit={submitWorkout}>
          <div className="gym-card-heading">
            <div>
              <span className="eyebrow">Nueva sesión</span>
              <h2>Registrar entrenamiento</h2>
            </div>
            <span className="gym-editor-mark">KG</span>
          </div>

          <div className="gym-session-fields">
            <div className="gym-auto-title">
              <span>Nombre automático</span>
              <strong>{generatedTitle}</strong>
            </div>
            <div className="gym-field-row">
              <label>
                <span>Fecha y hora</span>
                <input
                  onChange={(event) => setTrainedAt(event.target.value)}
                  required
                  type="datetime-local"
                  value={trainedAt}
                />
              </label>
              <label>
                <span>Duración total</span>
                <input
                  min="1"
                  onChange={(event) =>
                    setDurationMinutes(event.target.value)
                  }
                  required
                  step="1"
                  type="number"
                  value={durationMinutes}
                />
                <small>minutos</small>
              </label>
            </div>
            <label>
              <span>Notas de la sesión</span>
              <textarea
                maxLength={1000}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Energía, molestias, objetivo o contexto…"
                rows={2}
                value={notes}
              />
            </label>
          </div>

          <div className="gym-exercises-heading">
            <div>
              <span className="eyebrow">Ejercicios</span>
              <strong>{exercises.length} en la sesión</strong>
            </div>
            <button onClick={addExercise} type="button">
              + Agregar
            </button>
          </div>

          <div className="gym-exercise-list">
            {exercises.map((exercise, index) => (
              <fieldset className="gym-exercise-card" key={index}>
                <legend>Ejercicio {index + 1}</legend>
                {exercises.length > 1 ? (
                  <button
                    aria-label={`Eliminar ejercicio ${index + 1}`}
                    className="gym-exercise-remove"
                    onClick={() => removeExercise(index)}
                    type="button"
                  >
                    ×
                  </button>
                ) : null}
                <div className="gym-exercise-primary">
                  <label>
                    <span>Tipo</span>
                    <select
                      onChange={(event) =>
                        updateExercise(index, "kind", event.target.value)
                      }
                      value={exercise.kind}
                    >
                      {Object.entries(kindLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Ejercicio</span>
                    <span className="gym-catalog-input">
                      <input
                        maxLength={120}
                        onChange={(event) =>
                          updateExercise(index, "name", event.target.value)
                        }
                        placeholder={
                          exercise.kind === "strength"
                            ? "Ej. Press de banca"
                            : exercise.kind === "cardio"
                              ? "Ej. Caminadora"
                              : "Ej. Estiramiento"
                        }
                        required
                        value={exercise.name}
                      />
                      <button
                        disabled={
                          exercise.name.trim().length < 2 ||
                          catalogLoadingIndex !== null
                        }
                        onClick={() => void searchExercise(index)}
                        type="button"
                      >
                        {catalogLoadingIndex === index ? "…" : "Buscar"}
                      </button>
                    </span>
                  </label>
                </div>

                {catalogResults[index] ? (
                  <div className="gym-catalog-results">
                    {catalogResults[index].length === 0 ? (
                      <p>
                        Sin coincidencias. Puedes conservar el nombre manual.
                      </p>
                    ) : (
                      catalogResults[index].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => chooseExercise(index, item)}
                          type="button"
                        >
                          <strong>{item.name}</strong>
                          <span>{item.category ?? "Ejercicio"}</span>
                        </button>
                      ))
                    )}
                    <small>Catálogo gratuito de wger</small>
                  </div>
                ) : null}

                {exercise.kind === "strength" ? (
                  <div className="gym-metric-grid gym-strength-grid">
                    <label>
                      <span>Series</span>
                      <input
                        min="1"
                        onChange={(event) =>
                          updateExercise(index, "sets", event.target.value)
                        }
                        required
                        step="1"
                        type="number"
                        value={exercise.sets}
                      />
                    </label>
                    <label>
                      <span>Reps</span>
                      <input
                        min="1"
                        onChange={(event) =>
                          updateExercise(index, "reps", event.target.value)
                        }
                        required
                        step="1"
                        type="number"
                        value={exercise.reps}
                      />
                    </label>
                    <label>
                      <span>Peso kg</span>
                      <input
                        min="0"
                        onChange={(event) =>
                          updateExercise(index, "weightKg", event.target.value)
                        }
                        placeholder="Opcional"
                        step="0.01"
                        type="number"
                        value={exercise.weightKg}
                      />
                    </label>
                  </div>
                ) : exercise.kind === "cardio" ? (
                  <div className="gym-metric-grid">
                    <label>
                      <span>Distancia km</span>
                      <input
                        min="0"
                        onChange={(event) =>
                          updateExercise(
                            index,
                            "distanceKm",
                            event.target.value,
                          )
                        }
                        placeholder="Ej. 5"
                        step="0.01"
                        type="number"
                        value={exercise.distanceKm}
                      />
                    </label>
                    <label>
                      <span>Tiempo min</span>
                      <input
                        min="1"
                        onChange={(event) =>
                          updateExercise(
                            index,
                            "durationMinutes",
                            event.target.value,
                          )
                        }
                        placeholder="Ej. 30"
                        step="1"
                        type="number"
                        value={exercise.durationMinutes}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="gym-metric-grid">
                    <label>
                      <span>Tiempo min</span>
                      <input
                        min="1"
                        onChange={(event) =>
                          updateExercise(
                            index,
                            "durationMinutes",
                            event.target.value,
                          )
                        }
                        placeholder="Opcional"
                        step="1"
                        type="number"
                        value={exercise.durationMinutes}
                      />
                    </label>
                  </div>
                )}

                <label className="gym-exercise-notes">
                  <span>Nota</span>
                  <input
                    maxLength={500}
                    onChange={(event) =>
                      updateExercise(index, "notes", event.target.value)
                    }
                    placeholder="RPE, descanso, técnica…"
                    value={exercise.notes}
                  />
                </label>
              </fieldset>
            ))}
          </div>

          <button
            className="gym-submit-button"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Guardando…" : "Guardar entrenamiento"}
            <span>→</span>
          </button>
        </form>

        <section className="gym-history-card">
          <div className="gym-history-header">
            <div>
              <span className="eyebrow">Historial</span>
              <h2>Mis entrenamientos</h2>
            </div>
            <div className="gym-filter" role="group" aria-label="Periodo">
              {(
                [
                  ["week", "7 días"],
                  ["month", "30 días"],
                  ["all", "Todo"],
                ] as const
              ).map(([value, label]) => (
                <button
                  className={filter === value ? "gym-filter-active" : ""}
                  key={value}
                  onClick={() => setFilter(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="gym-workout-list" aria-live="polite">
            {isLoading ? (
              <div className="gym-empty">
                <span>···</span>
                <strong>Cargando tus sesiones</strong>
              </div>
            ) : visibleWorkouts.length === 0 ? (
              <div className="gym-empty">
                <span>KG</span>
                <strong>Aún no hay entrenamientos</strong>
                <p>Registra la primera sesión para comenzar tu progreso.</p>
              </div>
            ) : (
              visibleWorkouts.map((workout) => (
                <article className="gym-workout-item" key={workout.id}>
                  <div className="gym-workout-main">
                    <span className="gym-workout-icon">KG</span>
                    <div>
                      <h3>{workout.title}</h3>
                      <time dateTime={workout.trainedAt}>
                        {dateFormatter.format(new Date(workout.trainedAt))}
                      </time>
                    </div>
                    <div className="gym-workout-totals">
                      <strong>{workout.durationMinutes} min</strong>
                      <span>
                        {Math.round(workoutVolume(workout)).toLocaleString(
                          "es-MX",
                        )}{" "}
                        kg
                      </span>
                    </div>
                  </div>

                  <div className="gym-workout-exercises">
                    {workout.exercises.map((exercise) => (
                      <div key={exercise.id}>
                        <span
                          className={`gym-kind gym-kind-${exercise.kind}`}
                        >
                          {kindLabels[exercise.kind]}
                        </span>
                        <strong>{exercise.name}</strong>
                        <b>{exerciseDetail(exercise)}</b>
                      </div>
                    ))}
                  </div>

                  {workout.notes ? (
                    <p className="gym-workout-notes">{workout.notes}</p>
                  ) : null}
                  <button
                    className="gym-delete-button"
                    onClick={() => void removeWorkout(workout.id)}
                    type="button"
                  >
                    Eliminar sesión
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
