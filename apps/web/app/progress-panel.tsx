"use client";

import { useEffect, useMemo, useState } from "react";

import {
  loadProgress,
  type ProgressData,
  type ProgressDays,
} from "./progress-data";

const moneyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const shortDateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "short",
  day: "numeric",
});

function money(cents: number): string {
  return moneyFormatter.format(cents / 100);
}

function signedMoney(cents: number): string {
  return `${cents > 0 ? "+" : ""}${money(cents)}`;
}

function buildDailySeries(
  daily: ProgressData["daily"],
  days: ProgressDays,
): Array<{ date: string; count: number }> {
  const values = new Map(daily.map((item) => [item.date, item.count]));
  const series: Array<{ date: string; count: number }> = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    series.push({ date: key, count: values.get(key) ?? 0 });
  }
  return series;
}

export function ProgressPanel({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const [days, setDays] = useState<ProgressDays>(7);
  const [data, setData] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadProgress(sessionToken, days)
      .then((nextData) => {
        if (active) setData(nextData);
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "No fue posible cargar tu progreso.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days, sessionToken]);

  const dailySeries = useMemo(
    () => buildDailySeries(data?.daily ?? [], days),
    [data, days],
  );
  const maximumDaily = Math.max(...dailySeries.map((item) => item.count), 1);
  const settledBets =
    (data?.bets.wonCount ?? 0) + (data?.bets.lostCount ?? 0);
  const winRate =
    settledBets === 0
      ? null
      : Math.round(((data?.bets.wonCount ?? 0) / settledBets) * 100);

  function selectDays(nextDays: ProgressDays) {
    if (nextDays === days) return;
    setIsLoading(true);
    setError(null);
    setDays(nextDays);
  }

  return (
    <section className="progress-workspace">
      <div className="progress-toolbar">
        <div>
          <span className="eyebrow">Panorama personal</span>
          <p>Compara señales y decisiones dentro del mismo periodo.</p>
        </div>
        <div className="progress-period" role="group" aria-label="Periodo">
          <button
            className={days === 7 ? "progress-period-active" : ""}
            onClick={() => selectDays(7)}
            type="button"
          >
            7 días
          </button>
          <button
            className={days === 30 ? "progress-period-active" : ""}
            onClick={() => selectDays(30)}
            type="button"
          >
            30 días
          </button>
        </div>
      </div>

      {error ? <p className="progress-error">{error}</p> : null}

      <div className="progress-overview-grid">
        <article className="progress-score-card">
          <span>Actividad conectada</span>
          <strong>{data?.overview.totalRecords ?? 0}</strong>
          <p>registros durante los últimos {days} días</p>
          <div>
            <span>
              <b>{data?.overview.activeDays ?? 0}</b>
              días activos
            </span>
            <span>
              <b>{data?.overview.activeModules ?? 0}</b>
              módulos
            </span>
          </div>
        </article>
        <article className="progress-overview-card">
          <span>Flujo neto</span>
          <strong
            className={
              (data?.finances.netCents ?? 0) >= 0
                ? "progress-positive"
                : "progress-negative"
            }
          >
            {signedMoney(data?.finances.netCents ?? 0)}
          </strong>
          <p>{data?.finances.transactionCount ?? 0} movimientos</p>
        </article>
        <article className="progress-overview-card">
          <span>Sueño promedio</span>
          <strong>
            {data?.health.averageSleepHours === null ||
            data?.health.averageSleepHours === undefined
              ? "—"
              : `${data.health.averageSleepHours} h`}
          </strong>
          <p>{data?.health.entryCount ?? 0} mediciones</p>
        </article>
        <article className="progress-overview-card">
          <span>Tiempo entrenado</span>
          <strong>{data?.gym.durationMinutes ?? 0} min</strong>
          <p>{data?.gym.workoutCount ?? 0} sesiones</p>
        </article>
      </div>

      <section className="progress-chart-card">
        <header>
          <div>
            <span className="eyebrow">Constancia</span>
            <h2>Registros por día</h2>
          </div>
          <span>
            {isLoading ? "Actualizando…" : `${data?.overview.activeDays ?? 0} días con actividad`}
          </span>
        </header>
        <div className={`progress-bars ${days === 30 ? "progress-bars-month" : ""}`}>
          {dailySeries.map((item, index) => {
            const visibleLabel =
              days === 7 || index % 5 === 0 || index === days - 1;
            return (
              <div key={item.date}>
                <span
                  className={item.count > 0 ? "progress-bar-active" : ""}
                  style={{
                    height: `${Math.max(6, (item.count / maximumDaily) * 100)}%`,
                  }}
                  title={`${item.count} registros`}
                />
                <small>
                  {visibleLabel
                    ? shortDateFormatter.format(
                        new Date(`${item.date}T12:00:00`),
                      )
                    : ""}
                </small>
              </div>
            );
          })}
        </div>
      </section>

      <div className="progress-module-grid">
        <article className="progress-module-card progress-finance-card">
          <header>
            <span>$</span>
            <div>
              <small>Finanzas</small>
              <strong>{money(data?.finances.balanceCents ?? 0)}</strong>
            </div>
          </header>
          <dl>
            <div>
              <dt>Ingresos</dt>
              <dd className="progress-positive">
                {money(data?.finances.incomeCents ?? 0)}
              </dd>
            </div>
            <div>
              <dt>Gastos</dt>
              <dd>{money(data?.finances.expenseCents ?? 0)}</dd>
            </div>
          </dl>
        </article>

        <article className="progress-module-card progress-health-card">
          <header>
            <span>+</span>
            <div>
              <small>Salud</small>
              <strong>
                {data?.health.latestWeightKg === null ||
                data?.health.latestWeightKg === undefined
                  ? "Sin peso"
                  : `${data.health.latestWeightKg} kg`}
              </strong>
            </div>
          </header>
          <dl>
            <div>
              <dt>Cambio</dt>
              <dd>
                {data?.health.weightChangeKg === null ||
                data?.health.weightChangeKg === undefined
                  ? "—"
                  : `${data.health.weightChangeKg > 0 ? "+" : ""}${data.health.weightChangeKg} kg`}
              </dd>
            </div>
            <div>
              <dt>Agua promedio</dt>
              <dd>
                {data?.health.averageWaterMl === null ||
                data?.health.averageWaterMl === undefined
                  ? "—"
                  : `${data.health.averageWaterMl} ml`}
              </dd>
            </div>
          </dl>
        </article>

        <article className="progress-module-card progress-gym-card">
          <header>
            <span>KG</span>
            <div>
              <small>Gimnasio</small>
              <strong>{data?.gym.workoutCount ?? 0} sesiones</strong>
            </div>
          </header>
          <dl>
            <div>
              <dt>Duración</dt>
              <dd>{data?.gym.durationMinutes ?? 0} min</dd>
            </div>
            <div>
              <dt>Volumen</dt>
              <dd>{new Intl.NumberFormat("es-MX").format(data?.gym.volumeKg ?? 0)} kg</dd>
            </div>
          </dl>
        </article>

        <article className="progress-module-card progress-meals-card">
          <header>
            <span>C</span>
            <div>
              <small>Comidas</small>
              <strong>{data?.meals.count ?? 0} registros</strong>
            </div>
          </header>
          <dl>
            <div>
              <dt>Calorías promedio</dt>
              <dd>
                {data?.meals.averageCalories === null ||
                data?.meals.averageCalories === undefined
                  ? "—"
                  : `${data.meals.averageCalories} kcal`}
              </dd>
            </div>
            <div>
              <dt>Costo</dt>
              <dd>{money(data?.meals.costCents ?? 0)}</dd>
            </div>
          </dl>
        </article>

        <article className="progress-module-card progress-bets-card">
          <header>
            <span>1.8</span>
            <div>
              <small>Apuestas</small>
              <strong>{signedMoney(data?.bets.profitCents ?? 0)}</strong>
            </div>
          </header>
          <dl>
            <div>
              <dt>Monto jugado</dt>
              <dd>{money(data?.bets.stakedCents ?? 0)}</dd>
            </div>
            <div>
              <dt>Acierto resuelto</dt>
              <dd>{winRate === null ? "—" : `${winRate}%`}</dd>
            </div>
          </dl>
        </article>

        <article className="progress-module-card progress-time-card">
          <header>
            <span>23</span>
            <div>
              <small>Tiempo y memoria</small>
              <strong>{data?.events.upcomingCount ?? 0} próximos</strong>
            </div>
          </header>
          <dl>
            <div>
              <dt>Eventos del periodo</dt>
              <dd>{data?.events.periodCount ?? 0}</dd>
            </div>
            <div>
              <dt>Notas nuevas</dt>
              <dd>{data?.notes.periodCount ?? 0}</dd>
            </div>
          </dl>
        </article>
      </div>

      <section className="progress-connections-card">
        <header>
          <span className="eyebrow">Lectura cruzada</span>
          <h2>Conexiones del periodo</h2>
        </header>
        <div>
          <article>
            <span>
              <i style={{ background: "#ff9e75" }}>C</i>
              <i style={{ background: "#78d6a3" }}>$</i>
            </span>
            <div>
              <strong>Comidas × Finanzas</strong>
              <p>
                {data?.meals.count
                  ? `${money(data.meals.costCents)} distribuidos entre ${data.meals.count} comidas.`
                  : "Agrega costos a tus comidas para ver esta conexión."}
              </p>
            </div>
          </article>
          <article>
            <span>
              <i style={{ background: "#75d8e8" }}>KG</i>
              <i style={{ background: "#ff7f96" }}>+</i>
            </span>
            <div>
              <strong>Gimnasio × Salud</strong>
              <p>
                {data?.gym.workoutCount && data?.health.averageSleepHours
                  ? `${data.gym.workoutCount} sesiones con ${data.health.averageSleepHours} h de sueño promedio.`
                  : "Registra entrenamiento y sueño para observar recuperación."}
              </p>
            </div>
          </article>
          <article>
            <span>
              <i style={{ background: "#d39bff" }}>1.8</i>
              <i style={{ background: "#78d6a3" }}>$</i>
            </span>
            <div>
              <strong>Apuestas × Finanzas</strong>
              <p>
                {data?.bets.count
                  ? `Resultado neto de ${signedMoney(data.bets.profitCents)} en ${data.bets.count} boletos.`
                  : "Los resultados aparecerán aquí sin separarse de tu dinero."}
              </p>
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}
