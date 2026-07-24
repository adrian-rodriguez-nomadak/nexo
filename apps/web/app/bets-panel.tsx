"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiFetch } from "./api-client";

type BetStatus = "pending" | "won" | "lost" | "void";
type BetFilter = "all" | "pending" | "settled";
type Sportsbook = "Caliente" | "Draftea" | "Otro";

type BetSelection = {
  id: string;
  event: string;
  selection: string;
  market: string | null;
  decimalOdds: number | null;
};

type BetSelectionDraft = {
  event: string;
  selection: string;
  market: string;
  decimalOdds: string;
};

type NexoBet = {
  id: string;
  event: string;
  selection: string;
  market: string | null;
  sportsbook: string | null;
  selections: BetSelection[];
  financeAccountId: string | null;
  financeAccountName: string | null;
  financeSynced: boolean;
  stakeCents: number;
  decimalOdds: number;
  status: BetStatus;
  placedAt: string;
  settledAt: string | null;
  createdAt: string;
};

type BetSettings = {
  monthlyLimitCents: number;
};

type BetFinanceAccount = {
  id: string;
  name: string;
  balanceCents: number;
};

type BetSummary = {
  financeBalanceCents: number;
  monthlyLimitCents: number;
  monthlyStakedCents: number;
  remainingLimitCents: number;
  pendingStakeCents: number;
  potentialPayoutCents: number;
  settledProfitCents: number;
};

type BetsData = {
  bets: NexoBet[];
  financeAccounts: BetFinanceAccount[];
  settings: BetSettings;
  summary: BetSummary;
};

type ExtractedBetSlip = {
  recognized: boolean;
  sportsbook: Sportsbook;
  stakeCents: number | null;
  decimalOdds: number | null;
  placedAt: string | null;
  selections: Array<{
    event: string;
    selection: string;
    market: string | null;
    decimalOdds: number | null;
  }>;
  warnings: string[];
};

const emptySettings: BetSettings = {
  monthlyLimitCents: 0,
};

const emptySummary: BetSummary = {
  financeBalanceCents: 0,
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

const sportsbookOptions: Sportsbook[] = ["Caliente", "Draftea", "Otro"];

function emptySelectionDraft(): BetSelectionDraft {
  return {
    event: "",
    selection: "",
    market: "",
    decimalOdds: "",
  };
}

function initialSelectionDrafts(): BetSelectionDraft[] {
  return [emptySelectionDraft()];
}

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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("No fue posible leer la imagen."));
    reader.onerror = () => reject(new Error("No fue posible leer la imagen."));
    reader.readAsDataURL(file);
  });
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
    financeAccounts: data.financeAccounts ?? [],
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
  const [financeAccounts, setFinanceAccounts] = useState<BetFinanceAccount[]>(
    [],
  );
  const [summary, setSummary] = useState<BetSummary>(emptySummary);
  const [filter, setFilter] = useState<BetFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isExtractingImage, setIsExtractingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([]);

  const [selections, setSelections] = useState<BetSelectionDraft[]>(
    initialSelectionDrafts,
  );
  const [sportsbook, setSportsbook] = useState<Sportsbook>("Caliente");
  const [financeAccountId, setFinanceAccountId] = useState("");
  const [stake, setStake] = useState("");
  const [ticketOdds, setTicketOdds] = useState("");
  const [placedAt, setPlacedAt] = useState(() =>
    toLocalInputValue(new Date()),
  );
  const [monthlyLimit, setMonthlyLimit] = useState("");

  const applyData = useCallback(
    (data: BetsData) => {
      setBets(data.bets);
      setFinanceAccounts(data.financeAccounts);
      setFinanceAccountId((current) =>
        data.financeAccounts.some((account) => account.id === current)
          ? current
          : (data.financeAccounts[0]?.id ?? ""),
      );
      setSummary(data.summary);
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

  const derivedCombinedOdds = useMemo(() => {
    const odds = selections.map((selection) =>
      Number(selection.decimalOdds),
    );
    if (
      odds.some(
        (value, index) =>
          !selections[index]?.decimalOdds ||
          !Number.isFinite(value) ||
          value < 1.01,
      )
    ) {
      return null;
    }
    const combined = odds.reduce((total, value) => total * value, 1);
    return combined <= 1_000
      ? Math.round(combined * 1_000) / 1_000
      : null;
  }, [selections]);
  const providedTicketOdds = Number(ticketOdds);
  const effectiveOdds =
    ticketOdds &&
    Number.isFinite(providedTicketOdds) &&
    providedTicketOdds >= 1.01 &&
    providedTicketOdds <= 1_000
      ? Math.round(providedTicketOdds * 1_000) / 1_000
      : derivedCombinedOdds;

  function updateSelection(
    index: number,
    field: keyof BetSelectionDraft,
    value: string,
  ) {
    setSelections((current) =>
      current.map((selection, selectionIndex) =>
        selectionIndex === index
          ? { ...selection, [field]: value }
          : selection,
      ),
    );
  }

  function addSelection() {
    setSelections((current) =>
      current.length < 20 ? [...current, emptySelectionDraft()] : current,
    );
  }

  function removeSelection(index: number) {
    setSelections((current) =>
      current.length > 1
        ? current.filter((_, selectionIndex) => selectionIndex !== index)
        : current,
    );
  }

  async function importBetImage(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    input.value = "";

    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Usa una imagen PNG, JPG o WEBP de máximo 5 MB.");
      return;
    }

    setIsExtractingImage(true);
    setError(null);
    setExtractionWarnings([]);
    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      const response = await apiFetch(
        "/api/bets/extract-image",
        sessionToken,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ imageDataUrl }),
        },
      );
      const data = (await response.json()) as {
        extracted?: ExtractedBetSlip;
        error?: string;
      };
      if (!response.ok || !data.extracted) {
        throw new Error(data.error ?? "No fue posible leer el boleto.");
      }
      if (
        !data.extracted.recognized ||
        data.extracted.selections.length === 0
      ) {
        throw new Error("La imagen no parece contener un boleto de apuesta.");
      }

      setSelections(
        data.extracted.selections.map((selection) => ({
          event: selection.event,
          selection: selection.selection,
          market: selection.market ?? "",
          decimalOdds:
            selection.decimalOdds === null
              ? ""
              : String(selection.decimalOdds),
        })),
      );
      setSportsbook(data.extracted.sportsbook);
      setStake(
        data.extracted.stakeCents === null
          ? ""
          : String(data.extracted.stakeCents / 100),
      );
      setTicketOdds(
        data.extracted.decimalOdds === null
          ? ""
          : String(data.extracted.decimalOdds),
      );
      if (data.extracted.placedAt) {
        const extractedDate = new Date(data.extracted.placedAt);
        if (Number.isFinite(extractedDate.getTime())) {
          setPlacedAt(toLocalInputValue(extractedDate));
        }
      }
      setExtractionWarnings(data.extracted.warnings);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible leer el boleto.",
      );
    } finally {
      setIsExtractingImage(false);
    }
  }

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
    const placedDate = new Date(placedAt);
    if (
      !financeAccountId ||
      !effectiveOdds ||
      selections.some(
        (selection) =>
          selection.event.trim().length < 2 ||
          selection.selection.trim().length < 2,
      ) ||
      !stakeCents ||
      !Number.isFinite(placedDate.getTime())
    ) {
      setError(
        "Elige una cuenta y completa al menos una selección y la cuota total.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await apiFetch("/api/bets", sessionToken, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          selections: selections.map((selection) => ({
            ...selection,
            decimalOdds: selection.decimalOdds
              ? Number(selection.decimalOdds)
              : null,
          })),
          sportsbook,
          financeAccountId,
          stakeCents,
          decimalOdds: effectiveOdds,
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

      setSelections(initialSelectionDrafts());
      setStake("");
      setTicketOdds("");
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

    const monthlyLimitCents = parseMoneyToCents(monthlyLimit);
    if (monthlyLimitCents === null) {
      setError("El límite debe ser un monto válido.");
      return;
    }

    setIsSavingSettings(true);
    setError(null);
    try {
      const response = await apiFetch("/api/bets/settings", sessionToken, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ monthlyLimitCents }),
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
          <span>Saldo total en Finanzas</span>
          <strong>{formatMoney(summary.financeBalanceCents)}</strong>
          <small>
            Resultado liquidado de apuestas{" "}
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
                <h2>Registrar boleto</h2>
              </div>
              <span className="bets-odds-mark">
                {effectiveOdds ? effectiveOdds.toFixed(3) : "—"}
              </span>
            </div>

            <div className="bet-fields">
              <label className="bet-image-import">
                <input
                  accept="image/png,image/jpeg,image/webp"
                  disabled={isExtractingImage}
                  onChange={(event) => void importBetImage(event)}
                  type="file"
                />
                <span className="bet-image-import-mark">▣</span>
                <span>
                  <strong>
                    {isExtractingImage
                      ? "Leyendo boleto…"
                      : "Importar boleto desde imagen"}
                  </strong>
                  <small>
                    Nexo extrae los datos y tú los revisas antes de guardar.
                  </small>
                </span>
              </label>
              {extractionWarnings.length > 0 ? (
                <div className="bet-extraction-warnings">
                  <strong>Revisa estos datos</strong>
                  {extractionWarnings.map((warning) => (
                    <span key={warning}>{warning}</span>
                  ))}
                </div>
              ) : null}
              <div className="bet-ticket-heading">
                <span>Selecciones</span>
                <button
                  disabled={selections.length >= 20}
                  onClick={addSelection}
                  type="button"
                >
                  + Agregar
                </button>
              </div>
              <div className="bet-selection-list">
                {selections.map((selection, index) => (
                  <fieldset className="bet-selection-card" key={index}>
                    <legend>Selección {index + 1}</legend>
                    {selections.length > 1 ? (
                      <button
                        aria-label={`Eliminar selección ${index + 1}`}
                        className="bet-selection-remove"
                        onClick={() => removeSelection(index)}
                        type="button"
                      >
                        ×
                      </button>
                    ) : null}
                    <label>
                      <span>Evento</span>
                      <input
                        maxLength={160}
                        onChange={(event) =>
                          updateSelection(index, "event", event.target.value)
                        }
                        placeholder="Ej. Tigres vs Rayados"
                        required
                        value={selection.event}
                      />
                    </label>
                    <div className="bet-selection-row">
                      <label>
                        <span>Pronóstico</span>
                        <input
                          maxLength={120}
                          onChange={(event) =>
                            updateSelection(
                              index,
                              "selection",
                              event.target.value,
                            )
                          }
                          placeholder="Ej. Tigres gana"
                          required
                          value={selection.selection}
                        />
                      </label>
                      <label>
                        <span>Cuota individual</span>
                        <input
                          inputMode="decimal"
                          min="1.01"
                          onChange={(event) =>
                            updateSelection(
                              index,
                              "decimalOdds",
                              event.target.value,
                            )
                          }
                          placeholder="Opcional"
                          step="0.001"
                          type="number"
                          value={selection.decimalOdds}
                        />
                      </label>
                    </div>
                    <label>
                      <span>Mercado</span>
                      <input
                        maxLength={100}
                        onChange={(event) =>
                          updateSelection(index, "market", event.target.value)
                        }
                        placeholder="Ej. Resultado final"
                        value={selection.market}
                      />
                    </label>
                  </fieldset>
                ))}
              </div>
              <label>
                <span>Cuota total del boleto</span>
                <input
                  inputMode="decimal"
                  min="1.01"
                  onChange={(event) => setTicketOdds(event.target.value)}
                  placeholder={
                    derivedCombinedOdds
                      ? `Calculada: ${derivedCombinedOdds.toFixed(3)}`
                      : "Ej. 4.19"
                  }
                  step="0.001"
                  type="number"
                  value={ticketOdds}
                />
                <small>
                  Escríbela si la imagen no muestra las cuotas individuales.
                </small>
              </label>
              <label className="bet-finance-field">
                <span>Cuenta de Finanzas obligatoria</span>
                <select
                  onChange={(event) =>
                    setFinanceAccountId(event.target.value)
                  }
                  required
                  value={financeAccountId}
                >
                  {financeAccounts.length === 0 ? (
                    <option value="">Crea una cuenta en Finanzas</option>
                  ) : null}
                  {financeAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} · {formatMoney(account.balanceCents)}
                    </option>
                  ))}
                </select>
                <small>
                  {financeAccounts.length > 0
                    ? "El monto saldrá de esta cuenta; cobros y devoluciones regresarán a ella."
                    : "No puedes apostar todavía. Primero crea una cuenta en Finanzas."}
                </small>
              </label>
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
                  <span>Casa</span>
                  <select
                    onChange={(event) =>
                      setSportsbook(event.target.value as Sportsbook)
                    }
                    required
                    value={sportsbook}
                  >
                    {sportsbookOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                <span>Fecha</span>
                <input
                  onChange={(event) => setPlacedAt(event.target.value)}
                  required
                  type="datetime-local"
                  value={placedAt}
                />
              </label>
              <button
                className="bet-primary-button"
                disabled={
                  isSaving ||
                  financeAccounts.length === 0 ||
                  !financeAccountId ||
                  !effectiveOdds
                }
                type="submit"
              >
                {isSaving ? "Guardando…" : "Registrar boleto"}
              </button>
            </div>
          </form>

          <form className="bet-settings-card" onSubmit={submitSettings}>
            <div>
              <span className="eyebrow">Control</span>
              <h2>Límite mensual</h2>
              <p>
                El saldo viene de Finanzas. Aquí solo defines el máximo que
                puedes apostar al mes.
              </p>
            </div>
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
                        <h3>
                          {bet.sportsbook ?? "Otro"} ·{" "}
                          {bet.selections.length} selecciones
                        </h3>
                        <div className="bet-selection-summary">
                          {bet.selections.map((selection) => (
                            <p key={selection.id}>
                              <span>{selection.event}</span>
                              <strong>
                                {selection.selection}
                                {selection.market
                                  ? ` · ${selection.market}`
                                  : ""}
                              </strong>
                              <b>
                                {selection.decimalOdds === null
                                  ? "—"
                                  : selection.decimalOdds.toFixed(3)}
                              </b>
                            </p>
                          ))}
                        </div>
                        <small>
                          {dateFormatter.format(new Date(bet.placedAt))}
                        </small>
                        <span
                          className={
                            bet.financeSynced
                              ? "bet-finance-link"
                              : "bet-finance-link bet-finance-link-off"
                          }
                        >
                          {bet.financeSynced
                            ? `Finanzas · ${bet.financeAccountName}`
                            : "Cuenta financiera no disponible"}
                        </span>
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
