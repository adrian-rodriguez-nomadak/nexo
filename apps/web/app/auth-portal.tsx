"use client";

import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";

import { apiFetch, apiUrl } from "./api-client";
import { NexoDashboard } from "./nexo-dashboard";

type AuthView = "home" | "login" | "register";

type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

type BrowserSession = {
  token: string;
  expiresAt: string;
  user: AuthUser;
};

const SESSION_STORAGE_KEY = "nexo.auth.session.v1";

const productModules = [
  ["$", "Finanzas", "Cuentas, movimientos y decisiones con contexto."],
  ["23", "Eventos", "Tu agenda y tus recordatorios en un solo lugar."],
  ["N", "Notas", "Ideas organizadas para encontrarlas cuando importan."],
  ["C", "Comidas", "Alimentos, macros y costos conectados."],
  ["+", "Salud", "Tu perfil y tus señales personales a través del tiempo."],
  ["KG", "Gimnasio", "Sesiones, ejercicios y progreso medible."],
] as const;

function saveBrowserSession(session: BrowserSession): void {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function removeBrowserSession(): void {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

function readBrowserSession(): BrowserSession | null {
  const serialized = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!serialized) return null;

  try {
    const session = JSON.parse(serialized) as Partial<BrowserSession>;
    if (
      typeof session.token !== "string" ||
      typeof session.expiresAt !== "string" ||
      !session.user ||
      typeof session.user.email !== "string" ||
      typeof session.user.displayName !== "string" ||
      new Date(session.expiresAt).getTime() <= Date.now()
    ) {
      removeBrowserSession();
      return null;
    }
    return session as BrowserSession;
  } catch {
    removeBrowserSession();
    return null;
  }
}

function Brand() {
  return (
    <Link className="public-brand" href="/" aria-label="Ir al inicio de Nexo">
      <span className="brand-mark">N</span>
      <span>Nexo</span>
    </Link>
  );
}

function Landing() {
  return (
    <main className="landing-shell">
      <header className="public-header">
        <Brand />
        <nav aria-label="Acceso">
          <Link className="public-login-link" href="/login">
            Iniciar sesión
          </Link>
          <Link className="public-register-link" href="/register">
            Crear cuenta
          </Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <span className="landing-kicker">
            Tu sistema operativo personal
          </span>
          <h1>
            Todo lo que haces,
            <em> en contexto.</em>
          </h1>
          <p>
            Conecta dinero, tiempo, ideas y bienestar en un espacio privado
            diseñado para entender tu vida, no para complicarla.
          </p>
          <div className="landing-actions">
            <Link className="landing-primary-action" href="/register">
              Crear mi espacio
              <span>→</span>
            </Link>
            <Link className="landing-secondary-action" href="/login">
              Ya tengo cuenta
            </Link>
          </div>
          <small>
            Sin costo para comenzar · Tus registros son privados
          </small>
        </div>

        <div className="landing-preview" aria-label="Vista previa de Nexo">
          <div className="preview-topbar">
            <span>
              <i />
              Hoy
            </span>
            <b>AR</b>
          </div>
          <div className="preview-balance">
            <span>Tu día, conectado.</span>
            <strong>7 módulos</strong>
            <p>Un solo contexto para tomar mejores decisiones.</p>
          </div>
          <div className="preview-grid">
            <article>
              <span style={{ color: "#78d6a3" }}>$</span>
              <div>
                <small>Finanzas</small>
                <strong>$24,580</strong>
              </div>
            </article>
            <article>
              <span style={{ color: "#ff7f96" }}>+</span>
              <div>
                <small>Salud</small>
                <strong>7.5 h</strong>
              </div>
            </article>
            <article>
              <span style={{ color: "#75d8e8" }}>KG</span>
              <div>
                <small>Gimnasio</small>
                <strong>4 sesiones</strong>
              </div>
            </article>
          </div>
          <div className="preview-activity">
            <span>Actividad reciente</span>
            <p>
              <i style={{ background: "#ff9e75" }}>C</i>
              Comida registrada
              <time>14:30</time>
            </p>
            <p>
              <i style={{ background: "#8cb4ff" }}>23</i>
              Entrenamiento mañana
              <time>18:00</time>
            </p>
          </div>
        </div>
      </section>

      <section className="landing-modules">
        <div className="landing-section-heading">
          <span>Una vida no vive en silos</span>
          <h2>Cada módulo funciona solo. Juntos cuentan tu historia.</h2>
        </div>
        <div className="landing-module-grid">
          {productModules.map(([mark, name, description]) => (
            <article key={name}>
              <span>{mark}</span>
              <h3>{name}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-privacy">
        <span className="landing-privacy-mark">⌁</span>
        <div>
          <span>Privado por diseño</span>
          <h2>Tu información te pertenece.</h2>
          <p>
            Cada cuenta mantiene sus datos separados. Tú decides qué registrar
            y puedes eliminarlo cuando quieras.
          </p>
        </div>
        <Link href="/register">Empezar ahora →</Link>
      </section>

      <footer className="public-footer">
        <Brand />
        <span>Dinero, tiempo y bienestar conectados.</span>
        <small>© {new Date().getFullYear()} Nexo</small>
      </footer>
    </main>
  );
}

function AuthForm({
  mode,
  onAuthenticated,
}: {
  mode: "login" | "register";
  onAuthenticated: (session: BrowserSession) => void;
}) {
  const isRegister = mode === "register";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || (isRegister && !acceptedPrivacy)) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        apiUrl(`/api/auth/${isRegister ? "register" : "login"}`),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            ...(isRegister ? { displayName } : {}),
          }),
        },
      );
      const data = (await response.json()) as Partial<BrowserSession> & {
        error?: string;
      };
      if (
        !response.ok ||
        typeof data.token !== "string" ||
        typeof data.expiresAt !== "string" ||
        !data.user
      ) {
        throw new Error(data.error ?? "No fue posible continuar.");
      }

      const session = data as BrowserSession;
      saveBrowserSession(session);
      window.history.replaceState({}, "", "/");
      onAuthenticated(session);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible conectar con Nexo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Brand />
        <div>
          <span className="landing-kicker">
            {isRegister ? "Tu espacio empieza aquí" : "Qué bueno verte"}
          </span>
          <h1>
            {isRegister
              ? "Una cuenta. Toda tu vida conectada."
              : "Vuelve a tu contexto."}
          </h1>
          <p>
            {isRegister
              ? "Crea un espacio privado para conectar tus finanzas, agenda, ideas y bienestar."
              : "Tus registros, decisiones y progreso siguen donde los dejaste."}
          </p>
        </div>
        <blockquote>
          <span>“</span>
          La claridad aparece cuando dejas de ver cada parte de tu vida por
          separado.
        </blockquote>
      </section>

      <section className="auth-form-side">
        <Link className="auth-back-link" href="/">
          ← Volver al inicio
        </Link>
        <form className="auth-form-card" onSubmit={submit}>
          <header>
            <span className="eyebrow">
              {isRegister ? "Crear cuenta" : "Iniciar sesión"}
            </span>
            <h2>
              {isRegister ? "Crea tu espacio personal" : "Bienvenido de vuelta"}
            </h2>
            <p>
              {isRegister
                ? "Solo necesitamos lo esencial."
                : "Ingresa con tu correo y contraseña."}
            </p>
          </header>

          {isRegister ? (
            <label>
              Nombre
              <input
                autoComplete="name"
                maxLength={100}
                minLength={2}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="¿Cómo te llamas?"
                required
                value={displayName}
              />
            </label>
          ) : null}
          <label>
            Correo electrónico
            <input
              autoComplete="email"
              maxLength={254}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Contraseña
            <span className="auth-password-field">
              <input
                autoComplete={isRegister ? "new-password" : "current-password"}
                maxLength={128}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                pattern="(?=.*[A-Za-z])(?=.*\d)\S{8,128}"
                placeholder={isRegister ? "Mínimo 8 caracteres" : "Tu contraseña"}
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </span>
          </label>

          {isRegister ? (
            <>
              <small className="auth-password-help">
                Usa entre 8 y 128 caracteres, al menos una letra y un número.
              </small>
              <label className="auth-consent">
                <input
                  checked={acceptedPrivacy}
                  onChange={(event) => setAcceptedPrivacy(event.target.checked)}
                  required
                  type="checkbox"
                />
                <span>
                  Entiendo que Nexo almacena los datos que yo decida registrar
                  en mi espacio privado.
                </span>
              </label>
            </>
          ) : null}

          {error ? <p className="auth-error">{error}</p> : null}
          <button
            className="auth-submit"
            disabled={isSubmitting || (isRegister && !acceptedPrivacy)}
            type="submit"
          >
            {isSubmitting
              ? "Conectando…"
              : isRegister
                ? "Crear mi cuenta"
                : "Entrar a Nexo"}
            <span>→</span>
          </button>
          <p className="auth-switch">
            {isRegister ? "¿Ya tienes una cuenta?" : "¿Aún no tienes cuenta?"}{" "}
            <Link href={isRegister ? "/login" : "/register"}>
              {isRegister ? "Inicia sesión" : "Créala gratis"}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export function AuthPortal({ initialView }: { initialView: AuthView }) {
  const [session, setSession] = useState<BrowserSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const saved = readBrowserSession();
      if (!saved) {
        if (active) setIsRestoring(false);
        return;
      }

      try {
        const response = await apiFetch("/api/auth/me", saved.token);
        const data = (await response.json()) as {
          user?: AuthUser;
        };
        if (!response.ok || !data.user) throw new Error();
        const restored = { ...saved, user: data.user };
        saveBrowserSession(restored);
        if (active) setSession(restored);
      } catch {
        removeBrowserSession();
      } finally {
        if (active) setIsRestoring(false);
      }
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  if (isRestoring) {
    return (
      <main className="auth-loading">
        <Brand />
        <span>Abriendo tu espacio…</span>
      </main>
    );
  }

  if (session) {
    return (
      <NexoDashboard
        onSignOut={removeBrowserSession}
        sessionToken={session.token}
        signOutPath="/"
        user={{
          displayName: session.user.displayName,
          email: session.user.email,
          fullName: session.user.displayName,
        }}
      />
    );
  }

  if (initialView === "login" || initialView === "register") {
    return (
      <AuthForm
        mode={initialView}
        onAuthenticated={setSession}
      />
    );
  }

  return <Landing />;
}
