"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiFetch } from "./api-client";

type BetStatus = "pending" | "won" | "lost" | "void";
type BetFilter = "all" | "pending" | "settled";

type NexoBet = {
  id: string;
  event: string;
  selection: string;
  market: string | null;
  sportsbook: string | null;
  stakeCents: number;
  decimalOdds: number;
  status: BetStatus;
  placedAt: string;
  settledAt: string | null;
  createdAt: string;
};

type BetSettings = {
  bankrollCents: number;
  monthlyLimitCents: number;
};

type BetSummary = {
  bankrollCents: number;
  currentBankrollCents: number;
  monthlyLimitCents: number;
  monthlyStakedCents: number;
  remainingLimitCents: number;
  pendingStakeCents: number;
  potentialPayoutCents: number;
  settledProfitCents: number;
};

type BetsData = {
  bets: NexoBet[];
  settings: BetSettings;
  summary: BetSummary;
};

const emptySettings: BetSettings = {
  bankrollCents: 0,
  monthlyLimitCents: 0,
};

const emptySummary: BetSummary = {
  bankrollCents: 0,
  currentBankrollCents: 0,
  monthlyLimitCents: 0,
  monthlyStakedCents: 0,
  remainingLimitCents: 0,
  pendingStakeCents: 0,
  potentialPayoutCents: 0,
  settledProfitCents: 0,
};

const statusLabels: Record<BetStatus, string> = {
  pending: "Pendiente",
  won: "Ganada",
  lost: "Perdida",
  void: "Nula",
};

const moneyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatMoney(cents: number): string {
  return moneyFormatter.format(cents / 100);
}

function parseMoneyToCents(value: string): number | null {
  const normalized = value.trim().replace(/,/g, "");
  if (!normalized) return 0;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

function toLocalInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function betProfitCents(bet: NexoBet): number | null {
  if (bet.status === "pending") return null;
  if (bet.status === "lost") return -bet.stakeCents;
  if (bet.status === "void") return 0;
  return Math.round(bet.stakeCents * bet.decimalOdds) - bet.stakeCents;
}

async function fetchBets(sessionToken: string): Promise<BetsData> {
  const response = await apiFetch("/api/bets", sessionToken);
  const data = (await response.json()) as Partial<BetsData> & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? "No fue posible cargar Apuestas.");
  }

  return {
    bets: data.bets ?? [],
    settings: data.settings ?? emptySettings,
    summary: data.summary ?? emptySummary,
  };
}

export function BetsPanel({
  onCountChange,
  sessionToken,
}: {
  onCountChange: (count: number) => void;
  sessionToken: string;
}) {
  const [bets, setBets] = useState<NexoBet[]>([]);
  const [summary, setSummary] = useState<BetSummary>(emptySummary);
  const [filter, setFilter] = useState<BetFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eventName, setEventName] = useState("");
  const [selection, setSelection] = useState("");
  const [market, setMarket] = useState("");
  const [sportsbook, setSportsbook] = useState("");
  const [stake, setStake] = useState("");
  const [decimalOdds, setDecimalOdds] = useState("");
  const [placedAt, setPlacedAt] = useState(() =>
    toLocalInputValue(new Date()),
  );
  const [bankroll, setBankroll] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");

  const applyData = useCallback(
    (data: BetsData) => {
      setBets(data.bets);
      setSummary(data.summary);
      setBankroll(String(data.settings.bankrollCents / 100 || ""));
      setMonthlyLimit(String(data.settings.monthlyLimitCents / 100 || ""));
      onCountChange(data.bets.length);
    },
    [onCountChange],
  );

  const loadBets = useCallback(async () => {
    applyData(await fetchBets(sessionToken));
  }, [applyData, sessionToken]);

  useEffect(() => {
    let active = true;

    async function initializeBets() {
      try {
        const data = await fetchBets(sessionToken);
        if (active) applyData(data);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "No fue posible cargar Apuestas.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void initializeBets();
    return () => {
      active = false;
    };
  }, [applyData, sessionToken]);

  const visibleBets = useMemo(
    () =>
      bets.filter((bet) => {
        if (filter === "pending") return bet.status === "pending";
        if (filter === "settled") return bet.status !== "pending";
        return true;
      }),
    [bets, filter],
  );

  const limitUsage =
    summary.monthlyLimitCents > 0
      ? Math.min(
          (summary.monthlyStakedCents / summary.monthlyLimitCents) * 100,
          100,
        )
      : 0;

  async function submitBet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const stakeCents = parseMoneyToCents(stake);
    const odds = Number(decimalOdds);
    const placedDate = new Date(placedAt);
    if (
      eventName.trim().length < 2 ||
      selection.trim().length < 2 ||
      !stakeCents ||
      !Number.isFinite(odds) ||
      odds < 1.01 ||
      !Number.isFinite(placedDate.getTime())
    ) {
      setError("Completa el evento, selección, monto, cuota y fecha.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await apiFetch("/api/bets", sessionToken, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          event: eventName,
          selection,
          market,
          sportsbook,
          stakeCents,
          decimalOdds: odds,
          placedAt: placedDate.toISOString(),
        }),
      });
      const data = (await response.json()) as {
        bet?: NexoBet;
        error?: string;
      };
      if (!response.ok || !data.bet) {
        throw new Error(data.error ?? "No fue posible guardar la apuesta.");
      }

      setEventName("");
      setSelection("");
      setMarket("");
      setStake("");
      setDecimalOdds("");
      setPlacedAt(toLocalInputValue(new Date()));
      await loadBets();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar la apuesta.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingSettings) return;

    const bankrollCents = parseMoneyToCents(bankroll);
    const monthlyLimitCents = parseMoneyToCents(monthlyLimit);
    if (bankrollCents === null || monthlyLimitCents === null) {
      setError("El bankroll y el límite deben ser montos válidos.");
      return;
    }

    setIsSavingSettings(true);
    setError(null);
    try {
      const response = await apiFetch("/api/bets/settings", sessionToken, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bankrollCents, monthlyLimitCents }),
      });
      const data = (await response.json()) as {
        settings?: BetSettings;
        error?: string;
      };
      if (!response.ok || !data.settings) {
        throw new Error(data.error ?? "No fue posible guardar tus límites.");
      }
      await loadBets();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar tus límites.",
      );
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function changeStatus(id: string, status: BetStatus) {
    setError(null);
    try {
      const response = await apiFetch(`/api/bets/${id}/status`, sessionToken, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as {
        bet?: NexoBet;
        error?: string;
      };
      if (!response.ok || !data.bet) {
        throw new Error(data.error ?? "No fue posible actualizar el resultado.");
      }
      await loadBets();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible actualizar el resultado.",
      );
    }
  }

  async function removeBet(id: string) {
    const previous = bets;
    const nextBets = bets.filter((bet) => bet.id !== id);
    setBets(nextBets);
    onCountChange(nextBets.length);
    setError(null);

    try {
      const response = await apiFetch(`/api/bets/${id}`, sessionToken, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
      await loadBets();
    } catch {
      setBets(previous);
      onCountChange(previous.length);
      setError("No fue posible eliminar la apuesta.");
    }
  }

  return (
    <section className="bets-workspace">
      <div className="bets-responsible-banner">
        <div>
          <span className="bets-shield">L</span>
          <span>
            <strong>Tu límite va primero</strong>
            <small>
              Registra solo dinero destinado al entretenimiento. Nunca persigas
              pérdidas.
            </small>
          </span>
        </div>
        <span className="bets-limit-remaining">
          {summary.monthlyLimitCents > 0
            ? `${formatMoney(summary.remainingLimitCents)} disponibles`
            : "Configura tu límite mensual"}
        </span>
      </div>

      <div className="bets-summary-grid">
        <article className="bets-summary-card bets-bankroll-card">
          <span>Bankroll actual</span>
          <strong>{formatMoney(summary.currentBankrollCents)}</strong>
          <small>
            Inicial {formatMoney(summary.bankrollCents)} · Resultado{" "}
            <b
              className={
                summary.settledProfitCents >= 0
                  ? "bet-positive"
                  : "bet-negative"
              }
            >
              {formatMoney(summary.settledProfitCents)}
            </b>
          </small>
        </article>
        <article className="bets-summary-card">
          <span>En juego</span>
          <strong>{formatMoney(summary.pendingStakeCents)}</strong>
          <small>
            Retorno potencial {formatMoney(summary.potentialPayoutCents)}
          </small>
        </article>
        <article className="bets-summary-card bets-limit-card">
          <span>Límite del mes</span>
          <strong>
            {formatMoney(summary.monthlyStakedCents)}
            <small>
              {" "}
              /{" "}
              {summary.monthlyLimitCents
                ? formatMoney(summary.monthlyLimitCents)
                : "sin definir"}
            </small>
          </strong>
          <div className="bets-limit-track" aria-label="Uso del límite mensual">
            <i style={{ width: `${limitUsage}%` }} />
          </div>
        </article>
      </div>

      {error ? (
        <div className="bets-alert" role="alert">
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

      <div className="bets-content-grid">
        <div className="bets-editor-column">
          <form className="bet-editor-card" onSubmit={submitBet}>
            <div className="bets-card-heading">
              <div>
                <span className="eyebrow">Nueva</span>
                <h2>Registrar apuesta</h2>
              </div>
              <span className="bets-odds-mark">1.8</span>
            </div>

            <div className="bet-fields">
              <label>
                <span>Evento</span>
                <input
                  maxLength={160}
                  onChange={(event) => setEventName(event.target.value)}
                  placeholder="Ej. Tigres vs Rayados"
                  required
                  value={eventName}
                />
              </label>
              <div className="bet-field-row">
                <label>
                  <span>Selección</span>
                  <input
                    maxLength={120}
                    onChange={(event) => setSelection(event.target.value)}
                    placeholder="Ej. Tigres gana"
                    required
                    value={selection}
                  />
                </label>
                <label>
                  <span>Mercado</span>
                  <input
                    maxLength={100}
                    onChange={(event) => setMarket(event.target.value)}
                    placeholder="Resultado final"
                    value={market}
                  />
                </label>
              </div>
              <div className="bet-field-row">
                <label>
                  <span>Monto MXN</span>
                  <input
                    inputMode="decimal"
                    min="0.01"
                    onChange={(event) => setStake(event.target.value)}
                    placeholder="100.00"
                    required
                    step="0.01"
                    type="number"
                    value={stake}
                  />
                </label>
                <label>
                  <span>Cuota decimal</span>
                  <input
                    inputMode="decimal"
                    min="1.01"
                    onChange={(event) => setDecimalOdds(event.target.value)}
                    placeholder="1.80"
                    required
                    step="0.001"
                    type="number"
                    value={decimalOdds}
                  />
                </label>
              </div>
              <div className="bet-field-row">
                <label>
                  <span>Casa</span>
                  <input
                    maxLength={80}
                    onChange={(event) => setSportsbook(event.target.value)}
                    placeholder="Opcional"
                    value={sportsbook}
                  />
                </label>
                <label>
                  <span>Fecha</span>
                  <input
                    onChange={(event) => setPlacedAt(event.target.value)}
                    required
                    type="datetime-local"
                    value={placedAt}
                  />
                </label>
              </div>
              <button
                className="bet-primary-button"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Guardando…" : "Registrar apuesta"}
              </button>
            </div>
          </form>

          <form className="bet-settings-card" onSubmit={submitSettings}>
            <div>
              <span className="eyebrow">Control</span>
              <h2>Bankroll y límites</h2>
              <p>
                Define cuánto apartaste y el máximo que puedes apostar al mes.
              </p>
            </div>
            <div className="bet-field-row">
              <label>
                <span>Bankroll inicial</span>
                <input
                  min="0"
                  onChange={(event) => setBankroll(event.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={bankroll}
                />
              </label>
              <label>
                <span>Límite mensual</span>
                <input
                  min="0"
                  onChange={(event) => setMonthlyLimit(event.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={monthlyLimit}
                />
              </label>
            </div>
            <button disabled={isSavingSettings} type="submit">
              {isSavingSettings ? "Guardando…" : "Guardar límites"}
            </button>
          </form>
        </div>

        <section className="bets-history-card">
          <div className="bets-history-header">
            <div>
              <span className="eyebrow">Historial</span>
              <h2>Mis apuestas</h2>
            </div>
            <div className="bets-filter" role="group" aria-label="Filtrar apuestas">
              {(["all", "pending", "settled"] as BetFilter[]).map((value) => (
                <button
                  className={filter === value ? "bets-filter-active" : ""}
                  key={value}
                  onClick={() => setFilter(value)}
                  type="button"
                >
                  {value === "all"
                    ? "Todas"
                    : value === "pending"
                      ? "Pendientes"
                      : "Cerradas"}
                </button>
              ))}
            </div>
          </div>

          <div className="bets-list" aria-live="polite">
            {isLoading ? (
              <div className="bets-empty">
                <span>···</span>
                <strong>Cargando tu registro</strong>
              </div>
            ) : visibleBets.length === 0 ? (
              <div className="bets-empty">
                <span>1.8</span>
                <strong>No hay apuestas en esta vista</strong>
                <p>Registra una apuesta para comenzar a medir tus límites.</p>
              </div>
            ) : (
              visibleBets.map((bet) => {
                const profitCents = betProfitCents(bet);
                return (
                  <article className="bet-item" key={bet.id}>
                    <div className="bet-item-main">
                      <span
                        className={`bet-status bet-status-${bet.status}`}
                      >
                        {statusLabels[bet.status]}
                      </span>
                      <div>
                        <h3>{bet.event}</h3>
                        <p>
                          {bet.selection}
                          {bet.market ? ` · ${bet.market}` : ""}
                        </p>
                        <small>
                          {dateFormatter.format(new Date(bet.placedAt))}
                          {bet.sportsbook ? ` · ${bet.sportsbook}` : ""}
                        </small>
                      </div>
                      <div className="bet-item-money">
                        <strong>{formatMoney(bet.stakeCents)}</strong>
                        <span>cuota {bet.decimalOdds.toFixed(3)}</span>
                        {profitCents !== null ? (
                          <b
                            className={
                              profitCents >= 0
                                ? "bet-positive"
                                : "bet-negative"
                            }
                          >
                            {profitCents > 0 ? "+" : ""}
                            {formatMoney(profitCents)}
                          </b>
                        ) : (
                          <b>
                            Posible{" "}
                            {formatMoney(
                              Math.round(
                                bet.stakeCents * bet.decimalOdds,
                              ),
                            )}
                          </b>
                        )}
                      </div>
                    </div>
                    <footer className="bet-item-actions">
                      {bet.status === "pending" ? (
                        <>
                          <button
                            className="bet-result-won"
                            onClick={() => void changeStatus(bet.id, "won")}
                            type="button"
                          >
                            Ganada
                          </button>
                          <button
                            className="bet-result-lost"
                            onClick={() => void changeStatus(bet.id, "lost")}
                            type="button"
                          >
                            Perdida
                          </button>
                          <button
                            onClick={() => void changeStatus(bet.id, "void")}
                            type="button"
                          >
                            Nula
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => void changeStatus(bet.id, "pending")}
                          type="button"
                        >
                          Reabrir
                        </button>
                      )}
                      <button
                        className="bet-delete-button"
                        onClick={() => void removeBet(bet.id)}
                        type="button"
                      >
                        Eliminar
                      </button>
                    </footer>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>

      <p className="bets-disclaimer">
        Nexo solo registra información y no ofrece recomendaciones de apuesta.
        Si apostar deja de ser entretenimiento, detente y busca apoyo.
      </p>
    </section>
  );
}
