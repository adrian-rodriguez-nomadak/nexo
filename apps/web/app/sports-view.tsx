"use client";

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CloudRain,
  FileImage,
  History,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Wind,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  api,
  BetRisk,
  BetSelection,
  BetTicket,
  MatchAnalysis,
  MatchContext,
  SportsMatch,
  SportsOverview,
  SportsTeam,
} from "../lib/api";

type SportsTab = "matches" | "ticket" | "history";

const money = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value);

const dateTime = (value: string) => {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(date),
    time: new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
};

const sampleSelections: BetSelection[] = [
  {
    match: "Santos Laguna vs Tigres UANL",
    market: "Doble oportunidad",
    selection: "Tigres o empate",
    odds: 1.42,
    estimatedProbability: 74,
  },
  {
    match: "Club América vs Toluca",
    market: "Total de goles",
    selection: "Más de 2.5",
    odds: 2.1,
    estimatedProbability: 51,
  },
];

function TeamBadge({
  team,
  large = false,
}: {
  team: SportsTeam;
  large?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={`sports-team-badge ${large ? "large" : ""}`}>
      {team.logoUrl && !broken ? (
        <img src={team.logoUrl} alt="" onError={() => setBroken(true)} />
      ) : (
        <span>{team.shortName.slice(0, 3)}</span>
      )}
    </span>
  );
}

function LoadingSports() {
  return (
    <div className="sports-loading">
      <LoaderCircle className="spin" size={24} />
      <p>Conectando estadísticas, bajas y clima…</p>
    </div>
  );
}

export default function SportsView() {
  const [overview, setOverview] = useState<SportsOverview | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [context, setContext] = useState<MatchContext | null>(null);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [tab, setTab] = useState<SportsTab>("matches");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadOverview() {
    setError("");
    try {
      const data = await api.sportsOverview();
      setOverview(data);
      setSelectedId((current) => current || data.matches[0]?.id || "");
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "No se pudieron cargar los partidos.",
      );
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setAnalysis(null);
    setContext(null);
    api
      .sportsMatch(selectedId)
      .then(setContext)
      .catch((issue) =>
        setError(
          issue instanceof Error
            ? issue.message
            : "No se pudo abrir el partido.",
        ),
      );
  }, [selectedId]);

  async function runAnalysis() {
    if (!selectedId) return;
    setBusy(true);
    setError("");
    try {
      setAnalysis(await api.analyzeSportsMatch(selectedId));
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "No se pudo generar el análisis.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!overview && !error) return <LoadingSports />;
  const selected =
    overview?.matches.find((match) => match.id === selectedId) ?? null;

  return (
    <div className="sports-shell">
      <header className="sports-header">
        <div>
          <span className="sports-kicker">
            <span /> NEXO MATCH INTELLIGENCE
          </span>
          <h1>
            Decide con contexto, <em>no con impulso.</em>
          </h1>
          <p>
            Un análisis de Liga MX que cruza rendimiento, historial, planteles,
            bajas y clima antes de hablar de riesgo.
          </p>
        </div>
        <div className="sports-source">
          <span
            className={overview?.sourceStatus.mode === "live" ? "live" : "demo"}
          />
          <div>
            <strong>
              {overview?.sourceStatus.mode === "live"
                ? "Datos en vivo"
                : "Modo demostración"}
            </strong>
            <small>{overview?.currentMatchday}</small>
          </div>
          <button title="Actualizar" onClick={() => void loadOverview()}>
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      <nav className="sports-tabs">
        <button
          className={tab === "matches" ? "active" : ""}
          onClick={() => setTab("matches")}
        >
          <BarChart3 size={17} /> Partidos
        </button>
        <button
          className={tab === "ticket" ? "active" : ""}
          onClick={() => setTab("ticket")}
        >
          <ShieldCheck size={17} /> Analizar apuesta
        </button>
        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
        >
          <History size={17} /> Historial
        </button>
        <span>Solo Liga MX · Apertura {overview?.league.season}</span>
      </nav>

      {error && (
        <div className="sports-error">
          <AlertTriangle size={17} />
          {error}
          <button onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {tab === "matches" && (
        <>
          <section className="match-strip">
            <div className="match-strip-title">
              <span>PRÓXIMOS PARTIDOS</span>
              <strong>{overview?.matches.length ?? 0} encuentros</strong>
            </div>
            <div className="match-scroll">
              {overview?.matches.map((match) => (
                <MatchMini
                  key={match.id}
                  match={match}
                  selected={match.id === selectedId}
                  onClick={() => setSelectedId(match.id)}
                />
              ))}
            </div>
          </section>

          {selected && (
            <div className="sports-main-grid">
              <MatchHero
                match={selected}
                analysis={analysis}
                busy={busy}
                onAnalyze={() => void runAnalysis()}
              />
              <ContextPanel
                match={selected}
                context={context}
                analysis={analysis}
              />
            </div>
          )}
        </>
      )}
      {tab === "ticket" && <TicketAnalyzer matches={overview?.matches ?? []} />}
      {tab === "history" && <SportsHistory />}
      <footer className="sports-disclaimer">
        <ShieldCheck size={15} />
        Nexo estima escenarios; no garantiza resultados ni sustituye decisiones
        financieras responsables. Si apuestas, define límites.
      </footer>
    </div>
  );
}

function MatchMini({
  match,
  selected,
  onClick,
}: {
  match: SportsMatch;
  selected: boolean;
  onClick: () => void;
}) {
  const date = dateTime(match.startsAt);
  return (
    <button
      className={`match-mini ${selected ? "selected" : ""}`}
      onClick={onClick}
    >
      <div className="match-mini-top">
        <span>{date.day}</span>
        <strong>{date.time}</strong>
      </div>
      <div className="match-mini-team">
        <TeamBadge team={match.home} />
        <span>{match.home.name}</span>
        <b>LOC</b>
      </div>
      <div className="match-mini-team">
        <TeamBadge team={match.away} />
        <span>{match.away.name}</span>
        <b>VIS</b>
      </div>
      <div className="match-mini-foot">
        {match.weather ? (
          <>
            <Thermometer size={13} />
            {Math.round(match.weather.temperatureC)}°
          </>
        ) : (
          "Clima pendiente"
        )}
        <ChevronRight size={15} />
      </div>
    </button>
  );
}

function MatchHero({
  match,
  analysis,
  busy,
  onAnalyze,
}: {
  match: SportsMatch;
  analysis: MatchAnalysis | null;
  busy: boolean;
  onAnalyze: () => void;
}) {
  const date = dateTime(match.startsAt);
  return (
    <section className="match-hero">
      <div className="match-hero-top">
        <span>{match.matchday}</span>
        <p>
          {date.day} · {date.time} · {match.venue}
        </p>
        <div className="source-dots">
          {match.sources.map((source) => (
            <i title={source} key={source} />
          ))}
        </div>
      </div>
      <div className="versus">
        <div className="versus-team">
          <TeamBadge team={match.home} large />
          <h2>{match.home.name}</h2>
          <p>
            {match.home.position
              ? `${match.home.position}º · ${match.home.points} pts`
              : "Local"}
          </p>
        </div>
        <div className="versus-center">
          <span>VS</span>
          <b>PRÓXIMO</b>
        </div>
        <div className="versus-team">
          <TeamBadge team={match.away} large />
          <h2>{match.away.name}</h2>
          <p>
            {match.away.position
              ? `${match.away.position}º · ${match.away.points} pts`
              : "Visitante"}
          </p>
        </div>
      </div>
      {analysis ? (
        <div className="analysis-result">
          <div className="probability-title">
            <span>PROBABILIDAD ESTIMADA</span>
            <p>
              Confianza del modelo <strong>{analysis.confidence}%</strong>
            </p>
          </div>
          <div className="probability-bars">
            <Probability
              label={match.home.shortName}
              value={analysis.probabilities.homeWin}
              tone="home"
            />
            <Probability
              label="Empate"
              value={analysis.probabilities.draw}
              tone="draw"
            />
            <Probability
              label={match.away.shortName}
              value={analysis.probabilities.awayWin}
              tone="away"
            />
          </div>
          <div className="scenario">
            <Sparkles size={18} />
            <div>
              <strong>Lectura del partido</strong>
              <p>
                {analysis.expectedScenario} {analysis.summary}
              </p>
            </div>
          </div>
          <div className="goal-metrics">
            <Metric label="+1.5 goles" value={analysis.goals.over1_5} />
            <Metric label="+2.5 goles" value={analysis.goals.over2_5} />
            <Metric
              label="Ambos anotan"
              value={analysis.goals.bothTeamsScore}
            />
          </div>
        </div>
      ) : (
        <div className="analysis-empty">
          <div className="signal-orbit">
            <Sparkles size={22} />
          </div>
          <div>
            <strong>El contexto está listo</strong>
            <p>
              Calcula el escenario con el modelo estadístico. No usa IA para
              inventar probabilidades.
            </p>
          </div>
          <button onClick={onAnalyze} disabled={busy}>
            {busy ? (
              <>
                <LoaderCircle className="spin" size={17} /> Analizando…
              </>
            ) : (
              <>
                Generar análisis <ArrowRight size={17} />
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}

function Probability({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={`probability ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <i>
        <b style={{ width: `${value}%` }} />
      </i>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <strong>{value}%</strong>
      <span>{label}</span>
    </div>
  );
}

function ContextPanel({
  match,
  context,
  analysis,
}: {
  match: SportsMatch;
  context: MatchContext | null;
  analysis: MatchAnalysis | null;
}) {
  const weather = match.weather;
  return (
    <aside className="context-panel">
      <div className="context-panel-head">
        <div>
          <span>SEÑALES DEL PARTIDO</span>
          <h3>Lo que puede mover el resultado</h3>
        </div>
        <TrendingUp size={20} />
      </div>
      <div className="form-compare">
        <div>
          <span>RACHA · ÚLTIMOS 5</span>
          <strong>{match.home.shortName}</strong>
          <FormDots form={match.home.form} />
        </div>
        <div>
          <strong>{match.away.shortName}</strong>
          <FormDots form={match.away.form} />
        </div>
      </div>
      <div className="context-signals">
        <Signal
          icon={<Users size={18} />}
          label="Bajas reportadas"
          value={`${context?.availability.length ?? match.home.unavailablePlayers + match.away.unavailablePlayers}`}
          copy={
            context?.availability.length
              ? context.availability
                  .slice(0, 2)
                  .map((item) => item.playerName)
                  .join(", ")
              : "Sin incidencias confirmadas"
          }
          tone={(context?.availability.length ?? 0) >= 3 ? "warn" : ""}
        />
        <Signal
          icon={<CloudRain size={18} />}
          label="Clima"
          value={
            weather ? `${Math.round(weather.temperatureC)} °C` : "Pendiente"
          }
          copy={
            weather
              ? `${weather.label} · ${weather.precipitationProbability}% lluvia`
              : "Fuera del horizonte de pronóstico"
          }
          tone={weather?.impact === "high" ? "warn" : ""}
        />
        <Signal
          icon={<Wind size={18} />}
          label="Viento"
          value={weather ? `${Math.round(weather.windKmh)} km/h` : "—"}
          copy={
            weather?.impact === "low"
              ? "Impacto esperado bajo"
              : "Puede alterar el ritmo de juego"
          }
        />
      </div>
      {analysis ? (
        <div className="factor-list">
          <span>FACTORES CON MAYOR PESO</span>
          {analysis.keyFactors.map((factor, index) => (
            <p key={factor}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              {factor}
            </p>
          ))}
        </div>
      ) : (
        <div className="context-placeholder">
          <BarChart3 size={19} />
          <p>Genera el análisis para ordenar los factores por impacto.</p>
        </div>
      )}
      <div className="source-line">
        <span /> Fuentes separadas del cálculo · {match.sources.join(" + ")}
      </div>
    </aside>
  );
}

function FormDots({ form }: { form: string[] }) {
  return (
    <span className="form-dots">
      {form.length ? (
        form.map((item, index) => (
          <i className={item.toLowerCase()} key={`${item}-${index}`}>
            {item}
          </i>
        ))
      ) : (
        <small>Sin datos</small>
      )}
    </span>
  );
}

function Signal({
  icon,
  label,
  value,
  copy,
  tone = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  copy: string;
  tone?: string;
}) {
  return (
    <div className={`context-signal ${tone}`}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{copy}</p>
      </div>
    </div>
  );
}

function TicketAnalyzer({ matches }: { matches: SportsMatch[] }) {
  const [ticket, setTicket] = useState<BetTicket>({
    bookmaker: "Caliente",
    stake: 500,
    bankroll: 10000,
    totalOdds: 3.4,
    betType: "parlay",
    confirmed: false,
    selections: sampleSelections,
  });
  const [risk, setRisk] = useState<BetRisk | null>(null);
  const [busy, setBusy] = useState<"extract" | "analyze" | "">("");
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function updateSelection(index: number, patch: Partial<BetSelection>) {
    setTicket((current) => ({
      ...current,
      confirmed: false,
      selections: current.selections.map((selection, itemIndex) =>
        itemIndex === index ? { ...selection, ...patch } : selection,
      ),
    }));
    setRisk(null);
  }

  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 6_000_000) {
      setMessage("La imagen debe pesar menos de 6 MB.");
      return;
    }
    setBusy("extract");
    setMessage("");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await api.extractBetTicket(String(reader.result));
        if (!result.ticket) {
          setMessage(result.message ?? "No se pudo leer el boleto.");
          return;
        }
        const extracted = result.ticket;
        setTicket((current) => ({
          ...current,
          bookmaker: extracted.bookmaker ?? "",
          stake: extracted.stake ?? current.stake,
          totalOdds: extracted.totalOdds ?? current.totalOdds,
          betType: extracted.betType,
          confirmed: false,
          selections: extracted.selections.map((selection) => ({
            match: selection.match,
            market: selection.market,
            selection: selection.selection,
            odds: selection.odds ?? 1.01,
          })),
        }));
        setMessage(
          extracted.fieldsToReview.length
            ? `Lectura completada. Revisa: ${extracted.fieldsToReview.join(", ")}.`
            : `Lectura completada con ${Math.round(extracted.confidence * 100)}% de confianza.`,
        );
      } catch (issue) {
        setMessage(
          issue instanceof Error ? issue.message : "No se pudo leer la imagen.",
        );
      } finally {
        setBusy("");
      }
    };
    reader.readAsDataURL(file);
  }

  async function analyze() {
    setBusy("analyze");
    setMessage("");
    try {
      setRisk(await api.analyzeBet(ticket));
    } catch (issue) {
      setMessage(
        issue instanceof Error
          ? issue.message
          : "No se pudo calcular el riesgo.",
      );
    } finally {
      setBusy("");
    }
  }

  const productOdds = useMemo(
    () =>
      ticket.selections.reduce(
        (total, selection) => total * Number(selection.odds || 1),
        1,
      ),
    [ticket.selections],
  );

  return (
    <div className="ticket-layout">
      <section className="ticket-builder">
        <div className="ticket-heading">
          <div>
            <span className="sports-kicker">
              <span /> REVISIÓN DEL BOLETO
            </span>
            <h2>
              Primero leemos. <em>Después confirmas.</em>
            </h2>
            <p>Nexo no calcula riesgo hasta que verifiques todos los campos.</p>
          </div>
          <button
            className="upload-ticket"
            onClick={() => fileInput.current?.click()}
            disabled={Boolean(busy)}
          >
            {busy === "extract" ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Upload size={18} />
            )}{" "}
            Subir captura
          </button>
          <input
            ref={fileInput}
            hidden
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </div>
        <div className="ticket-meta">
          <label>
            Casa de apuesta
            <input
              value={ticket.bookmaker ?? ""}
              onChange={(event) =>
                setTicket({
                  ...ticket,
                  bookmaker: event.target.value,
                  confirmed: false,
                })
              }
            />
          </label>
          <label>
            Monto
            <input
              type="number"
              min="1"
              value={ticket.stake}
              onChange={(event) =>
                setTicket({
                  ...ticket,
                  stake: Number(event.target.value),
                  confirmed: false,
                })
              }
            />
          </label>
          <label>
            Bankroll
            <input
              type="number"
              min="1"
              value={ticket.bankroll}
              onChange={(event) =>
                setTicket({
                  ...ticket,
                  bankroll: Number(event.target.value),
                  confirmed: false,
                })
              }
            />
          </label>
          <label>
            Cuota total
            <input
              type="number"
              min="1.01"
              step=".01"
              value={ticket.totalOdds}
              onChange={(event) =>
                setTicket({
                  ...ticket,
                  totalOdds: Number(event.target.value),
                  confirmed: false,
                })
              }
            />
          </label>
        </div>
        {message && (
          <div className="ticket-message">
            <FileImage size={16} />
            {message}
          </div>
        )}
        <div className="selections-head">
          <span>SELECCIONES ({ticket.selections.length})</span>
          <small>Cuota calculada {productOdds.toFixed(2)}</small>
        </div>
        <div className="ticket-selections">
          {ticket.selections.map((selection, index) => (
            <div className="ticket-selection" key={index}>
              <span className="selection-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="selection-fields">
                <label>
                  Partido
                  <select
                    value={selection.match}
                    onChange={(event) =>
                      updateSelection(index, { match: event.target.value })
                    }
                  >
                    <option value={selection.match}>{selection.match}</option>
                    {matches.map((match) => {
                      const label = `${match.home.name} vs ${match.away.name}`;
                      return (
                        label !== selection.match && (
                          <option value={label} key={match.id}>
                            {label}
                          </option>
                        )
                      );
                    })}
                  </select>
                </label>
                <label>
                  Mercado
                  <input
                    value={selection.market}
                    onChange={(event) =>
                      updateSelection(index, { market: event.target.value })
                    }
                  />
                </label>
                <label>
                  Selección
                  <input
                    value={selection.selection}
                    onChange={(event) =>
                      updateSelection(index, { selection: event.target.value })
                    }
                  />
                </label>
                <label>
                  Cuota
                  <input
                    type="number"
                    min="1.01"
                    step=".01"
                    value={selection.odds}
                    onChange={(event) =>
                      updateSelection(index, {
                        odds: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <button
                className="remove-selection"
                title="Eliminar"
                onClick={() => {
                  setTicket({
                    ...ticket,
                    confirmed: false,
                    selections: ticket.selections.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  });
                  setRisk(null);
                }}
                disabled={ticket.selections.length === 1}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="add-selection"
          onClick={() =>
            setTicket({
              ...ticket,
              betType: "parlay",
              confirmed: false,
              selections: [
                ...ticket.selections,
                {
                  match: matches[0]
                    ? `${matches[0].home.name} vs ${matches[0].away.name}`
                    : "Partido",
                  market: "Ganador",
                  selection: "Local",
                  odds: 1.5,
                },
              ],
            })
          }
        >
          <Plus size={16} /> Agregar selección
        </button>
        <label
          className={`confirm-ticket ${ticket.confirmed ? "checked" : ""}`}
        >
          <input
            type="checkbox"
            checked={ticket.confirmed}
            onChange={(event) =>
              setTicket({ ...ticket, confirmed: event.target.checked })
            }
          />
          <span>{ticket.confirmed && <Check size={14} />}</span>
          <div>
            <strong>Confirmo que la lectura es correcta</strong>
            <small>
              Revisé partido, mercado, selección, cuota, monto y bankroll.
            </small>
          </div>
        </label>
        <button
          className="analyze-ticket"
          disabled={
            !ticket.confirmed || Boolean(busy) || !ticket.selections.length
          }
          onClick={() => void analyze()}
        >
          {busy === "analyze" ? (
            <>
              <LoaderCircle className="spin" size={18} /> Calculando riesgo…
            </>
          ) : (
            <>
              Analizar riesgo <ArrowRight size={18} />
            </>
          )}
        </button>
      </section>
      <RiskPanel risk={risk} ticket={ticket} />
    </div>
  );
}

function RiskPanel({
  risk,
  ticket,
}: {
  risk: BetRisk | null;
  ticket: BetTicket;
}) {
  if (!risk)
    return (
      <aside className="risk-panel empty">
        <div className="risk-empty-mark">
          <ShieldCheck size={30} />
        </div>
        <span>RESULTADO DE RIESGO</span>
        <h3>Tu análisis aparecerá aquí</h3>
        <p>
          Combinaremos cuota, probabilidad estimada, correlación entre
          selecciones y exposición de bankroll.
        </p>
        <div className="risk-preview">
          <div>
            <span>Exposición actual</span>
            <strong>
              {ticket.bankroll
                ? ((ticket.stake / ticket.bankroll) * 100).toFixed(1)
                : 0}
              %
            </strong>
          </div>
          <div>
            <span>Probabilidad implícita</span>
            <strong>
              {ticket.totalOdds > 1 ? (100 / ticket.totalOdds).toFixed(1) : 0}%
            </strong>
          </div>
        </div>
      </aside>
    );
  const levelLabel = {
    low: "Bajo",
    medium: "Medio",
    high: "Alto",
    critical: "Crítico",
  }[risk.riskLevel];
  return (
    <aside className={`risk-panel result ${risk.riskLevel}`}>
      <span>RESULTADO DE RIESGO</span>
      <div className="risk-score-row">
        <div
          className="risk-ring"
          style={
            { "--risk": `${risk.riskScore * 3.6}deg` } as React.CSSProperties
          }
        >
          <strong>{risk.riskScore}</strong>
          <small>/ 100</small>
        </div>
        <div>
          <small>NIVEL DE RIESGO</small>
          <h3>{levelLabel}</h3>
          <p>{risk.summary}</p>
        </div>
      </div>
      <div className="risk-stats">
        <div>
          <span>Prob. implícita</span>
          <strong>{risk.impliedProbability}%</strong>
        </div>
        <div>
          <span>Prob. estimada</span>
          <strong>{risk.estimatedProbability}%</strong>
        </div>
        <div>
          <span>Exposición</span>
          <strong>{risk.bankrollExposure}%</strong>
        </div>
        <div>
          <span>Valor esperado</span>
          <strong className={risk.expectedValue < 0 ? "negative" : "positive"}>
            {money(risk.expectedValue)}
          </strong>
        </div>
      </div>
      <div className="maximum-stake">
        <span>MONTO MÁXIMO CONSERVADOR</span>
        <strong>{money(risk.recommendedMaximumStake)}</strong>
        <small>Con bankroll de {money(risk.bankroll)}</small>
      </div>
      <div className="risk-warnings">
        {risk.warnings.map((warning) => (
          <p key={warning}>
            <AlertTriangle size={15} />
            {warning}
          </p>
        ))}
      </div>
    </aside>
  );
}

function SportsHistory() {
  const [data, setData] = useState<{
    matches: Array<Record<string, unknown>>;
    bets: Array<Record<string, unknown>>;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .sportsHistory()
      .then(setData)
      .catch((issue) =>
        setError(
          issue instanceof Error
            ? issue.message
            : "No se pudo cargar el historial.",
        ),
      );
  }, []);
  if (!data && !error) return <LoadingSports />;
  return (
    <section className="sports-history">
      <div className="history-heading">
        <span className="sports-kicker">
          <span /> MEMORIA DE ANÁLISIS
        </span>
        <h2>Decisiones anteriores</h2>
        <p>
          Conserva la lectura que viste en ese momento, incluso si las fuentes
          cambian después.
        </p>
      </div>
      {error && (
        <div className="sports-error">
          <AlertTriangle size={17} />
          {error}
        </div>
      )}
      {!data?.matches.length && !data?.bets.length ? (
        <div className="history-empty">
          <History size={26} />
          <h3>Aún no hay análisis guardados</h3>
          <p>
            Genera el primer análisis de partido o revisa un boleto para verlo
            aquí.
          </p>
        </div>
      ) : (
        <div className="history-grid">
          {data?.bets.map((item) => {
            const result = item.result as BetRisk;
            const ticket = item.ticket as BetTicket;
            return (
              <article key={String(item.id)}>
                <span>
                  APUESTA ·{" "}
                  {new Date(String(item.created_at)).toLocaleDateString(
                    "es-MX",
                  )}
                </span>
                <h3>
                  {ticket.bookmaker || "Boleto"} · {ticket.selections.length}{" "}
                  selección{ticket.selections.length === 1 ? "" : "es"}
                </h3>
                <div>
                  <strong>Riesgo {result.riskScore}/100</strong>
                  <small>{money(Number(item.stake))}</small>
                </div>
              </article>
            );
          })}
          {data?.matches.map((item) => {
            const result = item.result as MatchAnalysis;
            return (
              <article key={String(item.id)}>
                <span>
                  PARTIDO ·{" "}
                  {new Date(String(item.created_at)).toLocaleDateString(
                    "es-MX",
                  )}
                </span>
                <h3>
                  {String(item.match_provider_key)
                    .replace(/^demo-/, "")
                    .replaceAll("-", " vs ")}
                </h3>
                <div>
                  <strong>Confianza {result.confidence}%</strong>
                  <small>
                    {result.probabilities.homeWin} · {result.probabilities.draw}{" "}
                    · {result.probabilities.awayWin}
                  </small>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
