"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiFetch } from "./api-client";

type BiologicalSex = "female" | "male" | "intersex" | "unspecified";
type HealthFilter = "week" | "month" | "all";

type HealthProfile = {
  heightCm: number | null;
  birthDate: string | null;
  biologicalSex: BiologicalSex | null;
  bloodType: string | null;
  allergies: string[];
  conditions: string[];
  medications: string[];
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  targetWeightKg: number | null;
  notes: string | null;
  updatedAt: string;
};

type HealthEntry = {
  id: string;
  measuredAt: string;
  weightKg: number | null;
  sleepHours: number | null;
  waterMl: number | null;
  heartRateBpm: number | null;
  systolicMmHg: number | null;
  diastolicMmHg: number | null;
  glucoseMgDl: number | null;
  oxygenPercent: number | null;
  temperatureC: number | null;
  mood: number | null;
  symptoms: string[];
  notes: string | null;
  createdAt: string;
};

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const moodLabels: Record<number, string> = {
  1: "Muy bajo",
  2: "Bajo",
  3: "Neutral",
  4: "Bien",
  5: "Muy bien",
};

function toLocalInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function optionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function listFromText(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToText(value: string[]): string {
  return value.join(", ");
}

function latestValue<K extends keyof HealthEntry>(
  entries: HealthEntry[],
  key: K,
): HealthEntry[K] | null {
  for (const entry of entries) {
    if (entry[key] !== null) return entry[key];
  }
  return null;
}

function entryMetrics(entry: HealthEntry): string[] {
  return [
    entry.weightKg === null ? null : `${entry.weightKg} kg`,
    entry.sleepHours === null ? null : `${entry.sleepHours} h de sueño`,
    entry.waterMl === null
      ? null
      : `${new Intl.NumberFormat("es-MX").format(entry.waterMl)} ml de agua`,
    entry.heartRateBpm === null ? null : `${entry.heartRateBpm} lpm`,
    entry.systolicMmHg === null || entry.diastolicMmHg === null
      ? null
      : `${entry.systolicMmHg}/${entry.diastolicMmHg} mmHg`,
    entry.glucoseMgDl === null ? null : `${entry.glucoseMgDl} mg/dL glucosa`,
    entry.oxygenPercent === null ? null : `${entry.oxygenPercent}% SpO₂`,
    entry.temperatureC === null ? null : `${entry.temperatureC} °C`,
  ].filter((value): value is string => value !== null);
}

export function HealthPanel({
  onCountChange,
  sessionToken,
}: {
  onCountChange: (count: number) => void;
  sessionToken: string;
}) {
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [filter, setFilter] = useState<HealthFilter>("month");
  const [currentTime] = useState(Date.now);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [heightCm, setHeightCm] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [biologicalSex, setBiologicalSex] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [targetWeightKg, setTargetWeightKg] = useState("");
  const [profileNotes, setProfileNotes] = useState("");

  const [measuredAt, setMeasuredAt] = useState(() =>
    toLocalInputValue(new Date()),
  );
  const [weightKg, setWeightKg] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [waterMl, setWaterMl] = useState("");
  const [heartRateBpm, setHeartRateBpm] = useState("");
  const [systolicMmHg, setSystolicMmHg] = useState("");
  const [diastolicMmHg, setDiastolicMmHg] = useState("");
  const [glucoseMgDl, setGlucoseMgDl] = useState("");
  const [oxygenPercent, setOxygenPercent] = useState("");
  const [temperatureC, setTemperatureC] = useState("");
  const [mood, setMood] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [entryNotes, setEntryNotes] = useState("");

  const populateProfile = useCallback((next: HealthProfile | null) => {
    setHeightCm(next?.heightCm?.toString() ?? "");
    setBirthDate(next?.birthDate ?? "");
    setBiologicalSex(next?.biologicalSex ?? "");
    setBloodType(next?.bloodType ?? "");
    setAllergies(listToText(next?.allergies ?? []));
    setConditions(listToText(next?.conditions ?? []));
    setMedications(listToText(next?.medications ?? []));
    setEmergencyContactName(next?.emergencyContactName ?? "");
    setEmergencyContactPhone(next?.emergencyContactPhone ?? "");
    setTargetWeightKg(next?.targetWeightKg?.toString() ?? "");
    setProfileNotes(next?.notes ?? "");
  }, []);

  useEffect(() => {
    let active = true;

    async function initializeHealth() {
      try {
        const response = await apiFetch("/api/health", sessionToken);
        const data = (await response.json()) as {
          profile?: HealthProfile | null;
          entries?: HealthEntry[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "No fue posible cargar Salud.");
        }
        if (!active) return;

        const nextEntries = data.entries ?? [];
        const nextProfile = data.profile ?? null;
        setProfile(nextProfile);
        setEntries(nextEntries);
        populateProfile(nextProfile);
        onCountChange(nextEntries.length);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "No fue posible cargar Salud.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void initializeHealth();
    return () => {
      active = false;
    };
  }, [onCountChange, populateProfile, sessionToken]);

  const visibleEntries = useMemo(() => {
    if (filter === "all") return entries;
    const days = filter === "week" ? 7 : 30;
    const cutoff = currentTime - days * 24 * 60 * 60 * 1_000;
    return entries.filter(
      (entry) => new Date(entry.measuredAt).getTime() >= cutoff,
    );
  }, [currentTime, entries, filter]);

  const latestWeight = latestValue(entries, "weightKg") as number | null;
  const latestSleep = latestValue(entries, "sleepHours") as number | null;
  const latestWater = latestValue(entries, "waterMl") as number | null;
  const bmi =
    latestWeight !== null && profile?.heightCm
      ? latestWeight / (profile.heightCm / 100) ** 2
      : null;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingProfile) return;
    setIsSavingProfile(true);
    setError(null);
    setMessage(null);

    try {
      const response = await apiFetch("/api/health/profile", sessionToken, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          heightCm: optionalNumber(heightCm),
          birthDate: birthDate || null,
          biologicalSex: biologicalSex || null,
          bloodType: bloodType || null,
          allergies: listFromText(allergies),
          conditions: listFromText(conditions),
          medications: listFromText(medications),
          emergencyContactName: emergencyContactName.trim() || null,
          emergencyContactPhone: emergencyContactPhone.trim() || null,
          targetWeightKg: optionalNumber(targetWeightKg),
          notes: profileNotes.trim() || null,
        }),
      });
      const data = (await response.json()) as {
        profile?: HealthProfile;
        error?: string;
      };
      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? "No fue posible guardar el perfil.");
      }

      setProfile(data.profile);
      populateProfile(data.profile);
      setMessage("Perfil de salud actualizado.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar el perfil.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingEntry) return;
    setIsSavingEntry(true);
    setError(null);
    setMessage(null);

    try {
      const response = await apiFetch("/api/health/entries", sessionToken, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          measuredAt: new Date(measuredAt).toISOString(),
          weightKg: optionalNumber(weightKg),
          sleepHours: optionalNumber(sleepHours),
          waterMl: optionalNumber(waterMl),
          heartRateBpm: optionalNumber(heartRateBpm),
          systolicMmHg: optionalNumber(systolicMmHg),
          diastolicMmHg: optionalNumber(diastolicMmHg),
          glucoseMgDl: optionalNumber(glucoseMgDl),
          oxygenPercent: optionalNumber(oxygenPercent),
          temperatureC: optionalNumber(temperatureC),
          mood: optionalNumber(mood),
          symptoms: listFromText(symptoms),
          notes: entryNotes.trim() || null,
        }),
      });
      const data = (await response.json()) as {
        entry?: HealthEntry;
        error?: string;
      };
      if (!response.ok || !data.entry) {
        throw new Error(data.error ?? "No fue posible guardar la medición.");
      }

      const nextEntries = [data.entry, ...entries];
      setEntries(nextEntries);
      onCountChange(nextEntries.length);
      setWeightKg("");
      setSleepHours("");
      setWaterMl("");
      setHeartRateBpm("");
      setSystolicMmHg("");
      setDiastolicMmHg("");
      setGlucoseMgDl("");
      setOxygenPercent("");
      setTemperatureC("");
      setMood("");
      setSymptoms("");
      setEntryNotes("");
      setMeasuredAt(toLocalInputValue(new Date()));
      setMessage("Medición guardada.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar la medición.",
      );
    } finally {
      setIsSavingEntry(false);
    }
  }

  async function removeEntry(id: string) {
    const previous = entries;
    const nextEntries = entries.filter((entry) => entry.id !== id);
    setEntries(nextEntries);
    onCountChange(nextEntries.length);
    setError(null);

    try {
      const response = await apiFetch(
        `/api/health/entries/${id}`,
        sessionToken,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error();
    } catch {
      setEntries(previous);
      onCountChange(previous.length);
      setError("No fue posible eliminar la medición.");
    }
  }

  return (
    <section className="health-workspace">
      <div className="health-overview">
        <article className="health-hero-card">
          <span className="health-kicker">Expediente personal</span>
          <strong>{latestWeight === null ? "Tu punto de partida" : `${latestWeight} kg`}</strong>
          <p>
            Perfil, señales y contexto en un historial privado que puedes
            actualizar a tu ritmo.
          </p>
        </article>
        <article className="health-stat-card">
          <span>IMC estimado</span>
          <strong>{bmi === null ? "—" : bmi.toFixed(1)}</strong>
          <p>Con peso y altura recientes</p>
        </article>
        <article className="health-stat-card">
          <span>Último sueño</span>
          <strong>{latestSleep === null ? "—" : `${latestSleep} h`}</strong>
          <p>Duración registrada</p>
        </article>
        <article className="health-stat-card">
          <span>Última agua</span>
          <strong>
            {latestWater === null
              ? "—"
              : `${new Intl.NumberFormat("es-MX").format(latestWater)} ml`}
          </strong>
          <p>Consumo registrado</p>
        </article>
      </div>

      <div className="health-disclaimer">
        <span>i</span>
        <p>
          Nexo organiza información personal; no diagnostica ni sustituye la
          evaluación de un profesional de salud.
        </p>
      </div>

      {error || message ? (
        <div className={error ? "health-alert health-alert-error" : "health-alert"}>
          <span>{error ?? message}</span>
          <button
            aria-label="Cerrar aviso"
            onClick={() => {
              setError(null);
              setMessage(null);
            }}
            type="button"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="health-content-grid">
        <form className="health-card" onSubmit={saveProfile}>
          <div className="health-card-heading">
            <span className="health-card-mark">ID</span>
            <div>
              <span className="eyebrow">Datos estables</span>
              <h2>Perfil de salud</h2>
            </div>
          </div>

          <div className="health-form-grid">
            <label>
              Altura
              <span className="health-input-unit">
                <input
                  inputMode="decimal"
                  max="250"
                  min="50"
                  onChange={(event) => setHeightCm(event.target.value)}
                  placeholder="175"
                  step="0.1"
                  type="number"
                  value={heightCm}
                />
                <i>cm</i>
              </span>
            </label>
            <label>
              Fecha de nacimiento
              <input
                max={new Date().toISOString().slice(0, 10)}
                min="1900-01-01"
                onChange={(event) => setBirthDate(event.target.value)}
                type="date"
                value={birthDate}
              />
            </label>
            <label>
              Sexo biológico
              <select
                onChange={(event) => setBiologicalSex(event.target.value)}
                value={biologicalSex}
              >
                <option value="">Sin especificar</option>
                <option value="female">Femenino</option>
                <option value="male">Masculino</option>
                <option value="intersex">Intersexual</option>
                <option value="unspecified">Prefiero no indicar</option>
              </select>
            </label>
            <label>
              Tipo de sangre
              <select
                onChange={(event) => setBloodType(event.target.value)}
                value={bloodType}
              >
                <option value="">No registrado</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                  (type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Peso meta
              <span className="health-input-unit">
                <input
                  inputMode="decimal"
                  max="500"
                  min="20"
                  onChange={(event) => setTargetWeightKg(event.target.value)}
                  placeholder="70"
                  step="0.1"
                  type="number"
                  value={targetWeightKg}
                />
                <i>kg</i>
              </span>
            </label>
          </div>

          <div className="health-list-fields">
            <label>
              Alergias
              <textarea
                onChange={(event) => setAllergies(event.target.value)}
                placeholder="Penicilina, cacahuate…"
                rows={2}
                value={allergies}
              />
            </label>
            <label>
              Condiciones o antecedentes
              <textarea
                onChange={(event) => setConditions(event.target.value)}
                placeholder="Asma, hipertensión…"
                rows={2}
                value={conditions}
              />
            </label>
            <label>
              Medicamentos y suplementos
              <textarea
                onChange={(event) => setMedications(event.target.value)}
                placeholder="Nombre y dosis si la conoces"
                rows={2}
                value={medications}
              />
            </label>
          </div>
          <small className="health-field-help">
            Separa varios elementos con comas o saltos de línea.
          </small>

          <div className="health-form-grid health-contact-grid">
            <label>
              Contacto de emergencia
              <input
                maxLength={120}
                onChange={(event) =>
                  setEmergencyContactName(event.target.value)
                }
                placeholder="Nombre"
                value={emergencyContactName}
              />
            </label>
            <label>
              Teléfono
              <input
                maxLength={40}
                onChange={(event) =>
                  setEmergencyContactPhone(event.target.value)
                }
                placeholder="+52…"
                type="tel"
                value={emergencyContactPhone}
              />
            </label>
          </div>
          <label className="health-notes-field">
            Notas importantes
            <textarea
              maxLength={2_000}
              onChange={(event) => setProfileNotes(event.target.value)}
              placeholder="Cirugías, indicaciones, información útil…"
              rows={3}
              value={profileNotes}
            />
          </label>
          <button className="health-submit-button" disabled={isSavingProfile}>
            {isSavingProfile ? "Guardando…" : "Guardar perfil"}
          </button>
        </form>

        <form className="health-card" onSubmit={saveEntry}>
          <div className="health-card-heading">
            <span className="health-card-mark">+</span>
            <div>
              <span className="eyebrow">Historial</span>
              <h2>Nueva medición</h2>
            </div>
          </div>

          <label className="health-full-field">
            Fecha y hora
            <input
              onChange={(event) => setMeasuredAt(event.target.value)}
              required
              type="datetime-local"
              value={measuredAt}
            />
          </label>
          <div className="health-measure-grid">
            <label>
              Peso
              <span className="health-input-unit">
                <input
                  max="500"
                  min="20"
                  onChange={(event) => setWeightKg(event.target.value)}
                  step="0.1"
                  type="number"
                  value={weightKg}
                />
                <i>kg</i>
              </span>
            </label>
            <label>
              Sueño
              <span className="health-input-unit">
                <input
                  max="24"
                  min="0"
                  onChange={(event) => setSleepHours(event.target.value)}
                  step="0.1"
                  type="number"
                  value={sleepHours}
                />
                <i>h</i>
              </span>
            </label>
            <label>
              Agua
              <span className="health-input-unit">
                <input
                  max="20000"
                  min="0"
                  onChange={(event) => setWaterMl(event.target.value)}
                  step="1"
                  type="number"
                  value={waterMl}
                />
                <i>ml</i>
              </span>
            </label>
            <label>
              Pulso
              <span className="health-input-unit">
                <input
                  max="300"
                  min="20"
                  onChange={(event) => setHeartRateBpm(event.target.value)}
                  step="1"
                  type="number"
                  value={heartRateBpm}
                />
                <i>lpm</i>
              </span>
            </label>
            <label>
              Presión sistólica
              <span className="health-input-unit">
                <input
                  max="300"
                  min="50"
                  onChange={(event) => setSystolicMmHg(event.target.value)}
                  step="1"
                  type="number"
                  value={systolicMmHg}
                />
                <i>mmHg</i>
              </span>
            </label>
            <label>
              Presión diastólica
              <span className="health-input-unit">
                <input
                  max="200"
                  min="30"
                  onChange={(event) => setDiastolicMmHg(event.target.value)}
                  step="1"
                  type="number"
                  value={diastolicMmHg}
                />
                <i>mmHg</i>
              </span>
            </label>
            <label>
              Glucosa
              <span className="health-input-unit">
                <input
                  max="1000"
                  min="20"
                  onChange={(event) => setGlucoseMgDl(event.target.value)}
                  step="0.1"
                  type="number"
                  value={glucoseMgDl}
                />
                <i>mg/dL</i>
              </span>
            </label>
            <label>
              Oxígeno
              <span className="health-input-unit">
                <input
                  max="100"
                  min="50"
                  onChange={(event) => setOxygenPercent(event.target.value)}
                  step="0.1"
                  type="number"
                  value={oxygenPercent}
                />
                <i>%</i>
              </span>
            </label>
            <label>
              Temperatura
              <span className="health-input-unit">
                <input
                  max="45"
                  min="30"
                  onChange={(event) => setTemperatureC(event.target.value)}
                  step="0.1"
                  type="number"
                  value={temperatureC}
                />
                <i>°C</i>
              </span>
            </label>
            <label>
              Estado de ánimo
              <select
                onChange={(event) => setMood(event.target.value)}
                value={mood}
              >
                <option value="">Sin registrar</option>
                <option value="1">1 · Muy bajo</option>
                <option value="2">2 · Bajo</option>
                <option value="3">3 · Neutral</option>
                <option value="4">4 · Bien</option>
                <option value="5">5 · Muy bien</option>
              </select>
            </label>
          </div>
          <label className="health-notes-field">
            Síntomas
            <textarea
              onChange={(event) => setSymptoms(event.target.value)}
              placeholder="Dolor de cabeza, cansancio…"
              rows={2}
              value={symptoms}
            />
          </label>
          <label className="health-notes-field">
            Notas del día
            <textarea
              maxLength={2_000}
              onChange={(event) => setEntryNotes(event.target.value)}
              placeholder="Contexto, actividad, cambios o cómo te sentiste…"
              rows={3}
              value={entryNotes}
            />
          </label>
          <button className="health-submit-button" disabled={isSavingEntry}>
            {isSavingEntry ? "Guardando…" : "Guardar medición"}
          </button>
        </form>
      </div>

      <section className="health-history-card">
        <div className="health-history-header">
          <div>
            <span className="eyebrow">Seguimiento</span>
            <h2>Historial de salud</h2>
          </div>
          <div className="health-filter" role="group" aria-label="Periodo">
            {(
              [
                ["week", "7 días"],
                ["month", "30 días"],
                ["all", "Todo"],
              ] as const
            ).map(([value, label]) => (
              <button
                className={filter === value ? "health-filter-active" : ""}
                key={value}
                onClick={() => setFilter(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="health-empty">Cargando tu historial…</div>
        ) : visibleEntries.length === 0 ? (
          <div className="health-empty">
            <span>+</span>
            <strong>Aquí empieza tu línea base</strong>
            <p>
              Registra una o varias señales. No necesitas completar todos los
              campos cada vez.
            </p>
          </div>
        ) : (
          <div className="health-entry-list">
            {visibleEntries.map((entry) => (
              <article className="health-entry" key={entry.id}>
                <div className="health-entry-main">
                  <span className="health-entry-icon">+</span>
                  <div>
                    <time dateTime={entry.measuredAt}>
                      {dateFormatter.format(new Date(entry.measuredAt))}
                    </time>
                    <div className="health-metric-list">
                      {entryMetrics(entry).map((metric) => (
                        <span key={metric}>{metric}</span>
                      ))}
                      {entry.mood === null ? null : (
                        <span>Ánimo: {moodLabels[entry.mood]}</span>
                      )}
                    </div>
                  </div>
                </div>
                {entry.symptoms.length > 0 ? (
                  <p className="health-entry-context">
                    <b>Síntomas</b> {entry.symptoms.join(" · ")}
                  </p>
                ) : null}
                {entry.notes ? (
                  <p className="health-entry-context">{entry.notes}</p>
                ) : null}
                <button
                  className="health-delete-button"
                  onClick={() => void removeEntry(entry.id)}
                  type="button"
                >
                  Eliminar
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
