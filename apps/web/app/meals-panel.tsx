"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiFetch } from "./api-client";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

type NexoMeal = {
  id: string;
  name: string;
  type: MealType;
  notes: string | null;
  calories: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
  costCents: number;
  financeAccountId: string | null;
  financeAccountName: string | null;
  financeSynced: boolean;
  eatenAt: string;
  createdAt: string;
};

type FinanceAccount = {
  id: string;
  name: string;
  balanceCents: number;
};

type MealFilter = "today" | "week" | "all";

const mealTypeLabels: Record<MealType, string> = {
  breakfast: "Desayuno",
  lunch: "Comida",
  dinner: "Cena",
  snack: "Snack",
};

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function toLocalInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function isSameLocalDay(value: string, reference: Date): boolean {
  const date = new Date(value);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function optionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function macroLabel(value: number | null, suffix = "g"): string {
  return value === null ? "—" : `${value}${suffix}`;
}

export function MealsPanel({
  onCountChange,
  sessionToken,
}: {
  onCountChange: (count: number) => void;
  sessionToken: string;
}) {
  const [meals, setMeals] = useState<NexoMeal[]>([]);
  const [financeAccounts, setFinanceAccounts] = useState<FinanceAccount[]>([]);
  const [filter, setFilter] = useState<MealFilter>("today");
  const [currentTime] = useState(Date.now);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<MealType>("lunch");
  const [notes, setNotes] = useState("");
  const [calories, setCalories] = useState("");
  const [proteinGrams, setProteinGrams] = useState("");
  const [carbsGrams, setCarbsGrams] = useState("");
  const [fatGrams, setFatGrams] = useState("");
  const [cost, setCost] = useState("");
  const [financeAccountId, setFinanceAccountId] = useState("");
  const [eatenAt, setEatenAt] = useState(() =>
    toLocalInputValue(new Date()),
  );

  const loadMeals = useCallback(async () => {
    const response = await apiFetch("/api/meals", sessionToken);
    const data = (await response.json()) as {
      meals?: NexoMeal[];
      financeAccounts?: FinanceAccount[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? "No fue posible cargar Comidas.");
    }

    const nextMeals = data.meals ?? [];
    const nextAccounts = data.financeAccounts ?? [];
    setMeals(nextMeals);
    setFinanceAccounts(nextAccounts);
    setFinanceAccountId((current) => current || nextAccounts[0]?.id || "");
    onCountChange(nextMeals.length);
  }, [onCountChange, sessionToken]);

  useEffect(() => {
    let active = true;

    async function initializeMeals() {
      try {
        const response = await apiFetch("/api/meals", sessionToken);
        const data = (await response.json()) as {
          meals?: NexoMeal[];
          financeAccounts?: FinanceAccount[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "No fue posible cargar Comidas.");
        }
        if (!active) return;

        const nextMeals = data.meals ?? [];
        const nextAccounts = data.financeAccounts ?? [];
        setMeals(nextMeals);
        setFinanceAccounts(nextAccounts);
        setFinanceAccountId(nextAccounts[0]?.id ?? "");
        onCountChange(nextMeals.length);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "No fue posible cargar Comidas.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void initializeMeals();
    return () => {
      active = false;
    };
  }, [onCountChange, sessionToken]);

  const now = useMemo(() => new Date(currentTime), [currentTime]);
  const todayMeals = useMemo(
    () => meals.filter((meal) => isSameLocalDay(meal.eatenAt, now)),
    [meals, now],
  );
  const weekStart = useMemo(() => {
    const value = new Date(now);
    value.setDate(value.getDate() - 6);
    value.setHours(0, 0, 0, 0);
    return value.getTime();
  }, [now]);
  const visibleMeals = useMemo(() => {
    if (filter === "today") return todayMeals;
    if (filter === "week") {
      return meals.filter(
        (meal) => new Date(meal.eatenAt).getTime() >= weekStart,
      );
    }
    return meals;
  }, [filter, meals, todayMeals, weekStart]);

  const todaySummary = useMemo(
    () =>
      todayMeals.reduce(
        (summary, meal) => ({
          calories: summary.calories + (meal.calories ?? 0),
          protein: summary.protein + (meal.proteinGrams ?? 0),
          carbs: summary.carbs + (meal.carbsGrams ?? 0),
          fat: summary.fat + (meal.fatGrams ?? 0),
          costCents: summary.costCents + meal.costCents,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, costCents: 0 },
      ),
    [todayMeals],
  );

  const parsedCost = Number(cost);
  const hasCost = Number.isFinite(parsedCost) && parsedCost > 0;

  async function submitMeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || name.trim().length < 2) return;

    const eatenDate = new Date(eatenAt);
    const costCents = cost.trim() ? Math.round(Number(cost) * 100) : 0;
    if (!Number.isFinite(eatenDate.getTime())) {
      setError("Selecciona una fecha válida.");
      return;
    }
    if (!Number.isSafeInteger(costCents) || costCents < 0) {
      setError("El costo no es válido.");
      return;
    }
    if (costCents > 0 && !financeAccountId) {
      setError("Selecciona una cuenta de Finanzas para registrar el costo.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await apiFetch("/api/meals", sessionToken, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          notes,
          calories: optionalNumber(calories),
          proteinGrams: optionalNumber(proteinGrams),
          carbsGrams: optionalNumber(carbsGrams),
          fatGrams: optionalNumber(fatGrams),
          costCents,
          financeAccountId: costCents > 0 ? financeAccountId : null,
          eatenAt: eatenDate.toISOString(),
        }),
      });
      const data = (await response.json()) as {
        meal?: NexoMeal;
        error?: string;
      };
      if (!response.ok || !data.meal) {
        throw new Error(data.error ?? "No fue posible guardar la comida.");
      }

      setName("");
      setNotes("");
      setCalories("");
      setProteinGrams("");
      setCarbsGrams("");
      setFatGrams("");
      setCost("");
      setEatenAt(toLocalInputValue(new Date()));
      setFilter("today");
      await loadMeals();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar la comida.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeMeal(id: string) {
    const previous = meals;
    const nextMeals = meals.filter((meal) => meal.id !== id);
    setMeals(nextMeals);
    onCountChange(nextMeals.length);
    setError(null);

    try {
      const response = await apiFetch(`/api/meals/${id}`, sessionToken, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
      await loadMeals();
    } catch {
      setMeals(previous);
      onCountChange(previous.length);
      setError("No fue posible eliminar la comida.");
    }
  }

  return (
    <section className="meals-workspace">
      <div className="meals-overview">
        <article className="meals-hero-card">
          <span className="meals-kicker">Alimentación diaria</span>
          <strong>Lo que comes, con contexto.</strong>
          <p>
            Registra macros y costos sin convertir cada comida en una tarea.
          </p>
        </article>
        <article className="meals-stat-card">
          <span>Hoy</span>
          <strong>{todaySummary.calories}</strong>
          <p>kcal registradas</p>
        </article>
        <article className="meals-stat-card">
          <span>Proteína</span>
          <strong>{Math.round(todaySummary.protein)}g</strong>
          <p>consumidos hoy</p>
        </article>
        <article className="meals-stat-card">
          <span>Gasto</span>
          <strong>{currencyFormatter.format(todaySummary.costCents / 100)}</strong>
          <p>sincronizado con Finanzas</p>
        </article>
      </div>

      {error ? (
        <div className="meals-alert" role="alert">
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

      <div className="meals-content-grid">
        <form className="meal-editor-card" onSubmit={submitMeal}>
          <div className="meals-card-heading">
            <div>
              <span className="eyebrow">Nuevo registro</span>
              <h2>Agregar comida</h2>
            </div>
            <span className="meal-editor-mark">C</span>
          </div>

          <div className="meal-fields">
            <div className="meal-field-row">
              <label>
                <span>Tipo</span>
                <select
                  onChange={(event) =>
                    setType(event.target.value as MealType)
                  }
                  value={type}
                >
                  {Object.entries(mealTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Fecha y hora</span>
                <input
                  onChange={(event) => setEatenAt(event.target.value)}
                  required
                  type="datetime-local"
                  value={eatenAt}
                />
              </label>
            </div>
            <label>
              <span>¿Qué comiste?</span>
              <input
                maxLength={160}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Pollo con arroz y verduras"
                required
                value={name}
              />
            </label>
            <div className="meal-macro-grid">
              <label>
                <span>Calorías</span>
                <input
                  min="0"
                  onChange={(event) => setCalories(event.target.value)}
                  placeholder="650"
                  step="1"
                  type="number"
                  value={calories}
                />
              </label>
              <label>
                <span>Proteína</span>
                <input
                  min="0"
                  onChange={(event) => setProteinGrams(event.target.value)}
                  placeholder="42 g"
                  step="0.1"
                  type="number"
                  value={proteinGrams}
                />
              </label>
              <label>
                <span>Carbos</span>
                <input
                  min="0"
                  onChange={(event) => setCarbsGrams(event.target.value)}
                  placeholder="68 g"
                  step="0.1"
                  type="number"
                  value={carbsGrams}
                />
              </label>
              <label>
                <span>Grasa</span>
                <input
                  min="0"
                  onChange={(event) => setFatGrams(event.target.value)}
                  placeholder="18 g"
                  step="0.1"
                  type="number"
                  value={fatGrams}
                />
              </label>
            </div>
            <label>
              <span>Notas</span>
              <textarea
                maxLength={1000}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ingredientes, porción o cómo te sentiste…"
                rows={3}
                value={notes}
              />
            </label>
            <div className="meal-cost-box">
              <label>
                <span>Costo en MXN</span>
                <input
                  min="0"
                  onChange={(event) => setCost(event.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={cost}
                />
              </label>
              <label>
                <span>Cuenta de Finanzas</span>
                <select
                  disabled={!hasCost || financeAccounts.length === 0}
                  onChange={(event) =>
                    setFinanceAccountId(event.target.value)
                  }
                  value={financeAccountId}
                >
                  {financeAccounts.length === 0 ? (
                    <option value="">Crea una cuenta primero</option>
                  ) : (
                    financeAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ·{" "}
                        {currencyFormatter.format(account.balanceCents / 100)}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <small>
                Si agregas un costo, Nexo crea un gasto en Finanzas.
              </small>
            </div>
          </div>

          <button
            className="meal-submit-button"
            disabled={
              isSaving ||
              name.trim().length < 2 ||
              (hasCost && !financeAccountId)
            }
            type="submit"
          >
            {isSaving ? "Guardando…" : "Guardar comida"}
            <span>→</span>
          </button>
        </form>

        <section className="meals-history-card">
          <div className="meals-history-header">
            <div>
              <span className="eyebrow">Historial</span>
              <h2>Mis comidas</h2>
            </div>
            <div className="meals-filter" role="group" aria-label="Periodo">
              {(
                [
                  ["today", "Hoy"],
                  ["week", "7 días"],
                  ["all", "Todo"],
                ] as const
              ).map(([value, label]) => (
                <button
                  className={filter === value ? "meals-filter-active" : ""}
                  key={value}
                  onClick={() => setFilter(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="meals-list" aria-live="polite">
            {isLoading ? (
              <div className="meals-empty">
                <span>···</span>
                <strong>Cargando tus comidas</strong>
              </div>
            ) : visibleMeals.length === 0 ? (
              <div className="meals-empty">
                <span>C</span>
                <strong>Aún no hay comidas aquí</strong>
                <p>Agrega la primera para empezar tu registro.</p>
              </div>
            ) : (
              visibleMeals.map((meal) => (
                <article className="meal-item" key={meal.id}>
                  <div className="meal-item-main">
                    <span className={`meal-type meal-type-${meal.type}`}>
                      {mealTypeLabels[meal.type]}
                    </span>
                    <div>
                      <h3>{meal.name}</h3>
                      <time dateTime={meal.eatenAt}>
                        {dateFormatter.format(new Date(meal.eatenAt))}
                      </time>
                    </div>
                    <strong className="meal-calories">
                      {meal.calories === null ? "—" : meal.calories}
                      <small>kcal</small>
                    </strong>
                  </div>
                  <div className="meal-macros">
                    <span>
                      <b>P</b> {macroLabel(meal.proteinGrams)}
                    </span>
                    <span>
                      <b>C</b> {macroLabel(meal.carbsGrams)}
                    </span>
                    <span>
                      <b>G</b> {macroLabel(meal.fatGrams)}
                    </span>
                  </div>
                  {meal.notes ? <p className="meal-notes">{meal.notes}</p> : null}
                  <div className="meal-item-footer">
                    <span
                      className={
                        meal.financeSynced
                          ? "meal-finance-link"
                          : "meal-finance-link meal-finance-link-off"
                      }
                    >
                      {meal.financeSynced
                        ? `${currencyFormatter.format(meal.costCents / 100)} · ${meal.financeAccountName}`
                        : "Sin costo registrado"}
                    </span>
                    <button
                      aria-label={`Eliminar ${meal.name}`}
                      onClick={() => void removeMeal(meal.id)}
                      type="button"
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
