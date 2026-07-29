"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "./api-client";

type ObserverModuleKey =
  | "finances"
  | "events"
  | "notes"
  | "bets"
  | "meals"
  | "health"
  | "gym";

type ObserverModule = {
  key: ObserverModuleKey;
  name: string;
  mark: string;
  color: string;
  rule: string;
};

type ObserverPreferences = {
  enabledModules: ObserverModuleKey[];
  playSound: boolean;
  speakSavedItems: boolean;
  confirmBeforeSaving: boolean;
};

type ObserverDetection = {
  recognized: boolean;
  module: ObserverModuleKey | null;
  summary: string | null;
  content: string | null;
  confidence: number;
  reason: string;
};

const storageKey = "nexo.observer.preferences.v1";

const observerModules: ObserverModule[] = [
  {
    key: "finances",
    name: "Finanzas",
    mark: "$",
    color: "#78d6a3",
    rule: "Sólo ingresos, gastos y comprobantes de compra.",
  },
  {
    key: "events",
    name: "Eventos",
    mark: "23",
    color: "#8cb4ff",
    rule: "Fechas, citas, reservaciones y recordatorios.",
  },
  {
    key: "notes",
    name: "Notas",
    mark: "N",
    color: "#ffd166",
    rule: "Ideas, referencias y contenido que quieras recordar.",
  },
  {
    key: "meals",
    name: "Comidas",
    mark: "C",
    color: "#ff9e75",
    rule: "Comidas, recetas, alimentos y datos nutrimentales.",
  },
  {
    key: "health",
    name: "Salud",
    mark: "+",
    color: "#ff7f96",
    rule: "Sueño, agua y mediciones explícitas de bienestar.",
  },
  {
    key: "gym",
    name: "Gimnasio",
    mark: "KG",
    color: "#75d8e8",
    rule: "Ejercicios, series, peso, duración y entrenamientos.",
  },
  {
    key: "bets",
    name: "Apuestas",
    mark: "A",
    color: "#d39bff",
    rule: "Boletos y resultados; nunca sugerencias para apostar.",
  },
];

const defaultPreferences: ObserverPreferences = {
  enabledModules: [],
  playSound: true,
  speakSavedItems: true,
  confirmBeforeSaving: true,
};

function playNotificationSound(): void {
  const AudioContextClass =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(740, audioContext.currentTime);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.25);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.26);
  oscillator.addEventListener("ended", () => void audioContext.close());
}

function speak(message: string): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "es-MX";
  utterance.rate = 0.96;
  window.speechSynthesis.speak(utterance);
}

function frameSignature(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): string {
  const pixels = context.getImageData(0, 0, width, height).data;
  const samples: number[] = [];
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 12; x += 1) {
      const pixelX = Math.floor(((x + 0.5) / 12) * width);
      const pixelY = Math.floor(((y + 0.5) / 8) * height);
      const offset = (pixelY * width + pixelX) * 4;
      samples.push(
        ((pixels[offset] ?? 0) +
          (pixels[offset + 1] ?? 0) +
          (pixels[offset + 2] ?? 0)) /
          3,
      );
    }
  }
  const average =
    samples.reduce((total, sample) => total + sample, 0) / samples.length;
  return samples.map((sample) => (sample >= average ? "1" : "0")).join("");
}

function signatureDistance(left: string, right: string): number {
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) distance += 1;
  }
  return distance;
}

export function ObserverPanel({ sessionToken }: { sessionToken: string }) {
  const [preferences, setPreferences] =
    useState<ObserverPreferences>(defaultPreferences);
  const [isObserving, setIsObserving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detection, setDetection] = useState<ObserverDetection | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const analysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analysisInFlightRef = useRef(false);
  const lastSignatureRef = useRef("");
  const preferencesRef = useRef(preferences);

  const enabledCount = preferences.enabledModules.length;
  const enabledNames = useMemo(
    () =>
      observerModules
        .filter((module) => preferences.enabledModules.includes(module.key))
        .map((module) => module.name),
    [preferences.enabledModules],
  );

  useEffect(() => {
    let storedPreferences = defaultPreferences;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        storedPreferences = {
          ...defaultPreferences,
          ...(JSON.parse(stored) as Partial<ObserverPreferences>),
        };
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
    queueMicrotask(() => {
      setPreferences(storedPreferences);
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  }, [isReady, preferences]);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
      window.speechSynthesis?.cancel();
    },
    [],
  );

  function stopObserving(): void {
    if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
    analysisTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
    setIsObserving(false);
    setIsAnalyzing(false);
  }

  async function saveDetection(
    nextDetection: ObserverDetection,
    userConfirmed: boolean,
  ): Promise<void> {
    if (
      !nextDetection.recognized ||
      !nextDetection.module ||
      !nextDetection.content
    ) {
      return;
    }
    const response = await apiFetch("/api/observer/save", sessionToken, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        module: nextDetection.module,
        content: nextDetection.content,
        confidence: nextDetection.confidence,
        userConfirmed,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      omiSynced?: boolean;
      omiWarning?: string | null;
    };
    if (!response.ok) {
      throw new Error(payload.error ?? "No fue posible guardar la detección.");
    }

    const moduleName =
      observerModules.find((module) => module.key === nextDetection.module)
        ?.name ?? "Nexo";
    if (preferencesRef.current.playSound) playNotificationSound();
    if (preferencesRef.current.speakSavedItems) {
      window.setTimeout(
        () => speak(`Guardado en ${moduleName}. ${nextDetection.summary ?? ""}`),
        preferencesRef.current.playSound ? 320 : 0,
      );
    }
    setLastSaved(
      `${moduleName}: ${nextDetection.summary ?? nextDetection.content}${
        payload.omiSynced ? " · Sincronizado con Omi" : " · Guardado en Nexo"
      }`,
    );
    setDetection(null);
  }

  async function analyzeCurrentFrame(): Promise<void> {
    const video = previewRef.current;
    if (
      !video ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      analysisInFlightRef.current
    ) {
      return;
    }

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) return;
    const width = Math.min(1280, sourceWidth);
    const height = Math.max(1, Math.round((sourceHeight / sourceWidth) * width));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", {
      alpha: false,
      willReadFrequently: true,
    });
    if (!context) return;
    context.drawImage(video, 0, 0, width, height);

    const signature = frameSignature(context, width, height);
    if (
      lastSignatureRef.current &&
      signatureDistance(signature, lastSignatureRef.current) < 9
    ) {
      return;
    }
    lastSignatureRef.current = signature;

    analysisInFlightRef.current = true;
    setIsAnalyzing(true);
    try {
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.62);
      const response = await apiFetch("/api/observer/analyze", sessionToken, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          imageDataUrl,
          enabledModules: preferencesRef.current.enabledModules,
        }),
      });
      const payload = (await response.json()) as {
        detection?: ObserverDetection;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "No fue posible analizar la pantalla.");
      }
      if (payload.detection?.recognized) {
        setDetection(payload.detection);
        if (!preferencesRef.current.confirmBeforeSaving) {
          await saveDetection(payload.detection, false);
        }
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible analizar la pantalla.",
      );
    } finally {
      analysisInFlightRef.current = false;
      setIsAnalyzing(false);
    }
  }

  async function startObserving(): Promise<void> {
    setError(null);
    if (enabledCount === 0) {
      setError("Activa al menos un módulo para comenzar.");
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Este navegador no permite compartir la pantalla.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 2, max: 5 } },
        audio: false,
      });
      streamRef.current = stream;
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        await previewRef.current.play();
      }
      stream.getVideoTracks()[0]?.addEventListener("ended", stopObserving, {
        once: true,
      });
      setIsObserving(true);
      lastSignatureRef.current = "";
      window.setTimeout(() => void analyzeCurrentFrame(), 1500);
      analysisTimerRef.current = setInterval(
        () => void analyzeCurrentFrame(),
        12_000,
      );
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "NotAllowedError") {
        setError("No se inició la sesión porque no elegiste una pantalla.");
      } else {
        setError("No fue posible iniciar la observación.");
      }
    }
  }

  function toggleModule(key: ObserverModuleKey): void {
    setPreferences((current) => ({
      ...current,
      enabledModules: current.enabledModules.includes(key)
        ? current.enabledModules.filter((module) => module !== key)
        : [...current.enabledModules, key],
    }));
  }

  function updatePreference(
    key: "playSound" | "speakSavedItems" | "confirmBeforeSaving",
    value: boolean,
  ): void {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function testAnnouncement(): void {
    if (preferences.playSound) playNotificationSound();
    if (preferences.speakSavedItems) {
      window.setTimeout(
        () => speak("Guardado en Finanzas. Gasto de 450 pesos en gasolina."),
        preferences.playSound ? 320 : 0,
      );
    }
  }

  return (
    <section className="observer-workspace">
      <section
        className={`observer-session ${isObserving ? "observer-session-active" : ""}`}
      >
        <div className="observer-session-copy">
          <span className="observer-eye" aria-hidden="true">
            ◉
          </span>
          <div>
            <span className="eyebrow">
              {isObserving ? "Sesión activa" : "Observador en pausa"}
            </span>
            <h2>
              {isObserving
                ? "Nexo puede ver la pantalla elegida."
                : "Tú decides cuándo empieza a mirar."}
            </h2>
            <p>
              {enabledCount === 1
                ? "1 módulo autorizado"
                : `${enabledCount} módulos autorizados`}
              {enabledNames.length ? ` · ${enabledNames.join(", ")}` : ""}
            </p>
          </div>
        </div>
        <button
          className="observer-session-button"
          onClick={() =>
            isObserving ? stopObserving() : void startObserving()
          }
          type="button"
        >
          <span>{isObserving ? "■" : "▶"}</span>
          {isObserving ? "Terminar observación" : "Compartir pantalla"}
        </button>
        {error ? <p className="observer-error">{error}</p> : null}
      </section>

      <section
        className={
          isObserving ? "observer-preview-card" : "observer-hidden-preview"
        }
      >
          <header>
            <div>
              <span className="observer-live-dot" />
              <strong>Vista compartida</strong>
            </div>
            <small>Visible sólo durante esta sesión</small>
          </header>
          <video
            aria-label="Vista previa de la pantalla compartida"
            autoPlay
            muted
            playsInline
            ref={previewRef}
          />
      </section>

      {detection ? (
        <section className="observer-detection" aria-live="polite">
          <span className="observer-detection-icon">✦</span>
          <div>
            <span className="eyebrow">Nexo detectó algo importante</span>
            <h3>{detection.summary}</h3>
            <p>{detection.content}</p>
          </div>
          <div className="observer-detection-actions">
            <button
              onClick={() => {
                void saveDetection(detection, true).catch((caught: unknown) =>
                  setError(
                    caught instanceof Error
                      ? caught.message
                      : "No fue posible guardar la detección.",
                  ),
                );
              }}
              type="button"
            >
              Guardar
            </button>
            <button onClick={() => setDetection(null)} type="button">
              Descartar
            </button>
          </div>
        </section>
      ) : null}

      {isObserving || lastSaved ? (
        <div className="observer-activity" aria-live="polite">
          <span className={isAnalyzing ? "observer-spinner" : ""}>
            {isAnalyzing ? "↻" : "✓"}
          </span>
          {isAnalyzing
            ? "Analizando un cambio relevante…"
            : lastSaved
              ? `Último guardado · ${lastSaved}`
              : "Esperando un cambio significativo en pantalla…"}
        </div>
      ) : null}

      <div className="observer-grid">
        <section className="observer-card">
          <header className="observer-card-header">
            <div>
              <span className="eyebrow">Permisos</span>
              <h3>A qué debe prestar atención</h3>
            </div>
            <span>{enabledCount}/7</span>
          </header>
          <p className="observer-card-intro">
            Omi ignorará lo que no pertenezca a los módulos autorizados.
          </p>
          <div className="observer-module-list">
            {observerModules.map((module) => {
              const enabled = preferences.enabledModules.includes(module.key);
              return (
                <label
                  className={`observer-module ${enabled ? "observer-module-enabled" : ""}`}
                  key={module.key}
                >
                  <span
                    className="observer-module-mark"
                    style={{ background: module.color }}
                  >
                    {module.mark}
                  </span>
                  <span>
                    <strong>{module.name}</strong>
                    <small>{module.rule}</small>
                  </span>
                  <input
                    checked={enabled}
                    onChange={() => toggleModule(module.key)}
                    type="checkbox"
                  />
                  <i aria-hidden="true" />
                </label>
              );
            })}
          </div>
        </section>

        <aside className="observer-side">
          <section className="observer-card">
            <span className="eyebrow">Avisos y guardado</span>
            <h3>Confirma lo que pasó</h3>
            <div className="observer-setting-list">
              <ObserverSetting
                checked={preferences.playSound}
                description="Reproduce un tono después de guardar."
                label="Sonido de notificación"
                onChange={(value) => updatePreference("playSound", value)}
              />
              <ObserverSetting
                checked={preferences.speakSavedItems}
                description="Dice el módulo y un resumen del registro."
                label="Decir en voz alta lo guardado"
                onChange={(value) =>
                  updatePreference("speakSavedItems", value)
                }
              />
              <ObserverSetting
                checked={preferences.confirmBeforeSaving}
                description="Recomendado para evitar registros erróneos."
                label="Confirmar antes de guardar"
                onChange={(value) =>
                  updatePreference("confirmBeforeSaving", value)
                }
              />
            </div>
            <button
              className="observer-test-button"
              onClick={testAnnouncement}
              type="button"
            >
              Probar sonido y voz <span>♪</span>
            </button>
          </section>

          <section className="observer-privacy">
            <span>⌁</span>
            <div>
              <strong>Sesión siempre visible</strong>
              <p>
                El navegador muestra cuándo compartes pantalla. Puedes detenerla
                desde Nexo o desde el aviso del navegador.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function ObserverSetting({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="observer-setting">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <i aria-hidden="true" />
    </label>
  );
}
