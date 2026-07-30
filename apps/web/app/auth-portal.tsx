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

const lifeTopics = [
  "Agenda",
  "Pendientes",
  "Finanzas",
  "Personas",
  "Salud",
  "Proyectos",
  "Hábitos",
  "Ideas",
  "Viajes",
  "Hogar",
] as const;

function saveBrowserSession(session: BrowserSession): void {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function removeBrowserSession(): void {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

function readBrowserSession(): BrowserSession | null {
  const serialized = window.localStorage.getItem(SESSION_STORAGE_KEY);
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
            Una conversación para todo
          </span>
          <h1>
            Cuéntame tu vida.
            <em> Yo conecto los puntos.</em>
          </h1>
          <p>
            Nexo entiende lo que dices, recuerda lo importante y te ayuda a
            convertirlo en decisiones, recordatorios y acciones.
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
            Un solo chat · Memoria bajo tu control · Privado por diseño
          </small>
        </div>

        <div className="landing-preview landing-chat-preview" aria-label="Vista previa de una conversación con Nexo">
          <div className="preview-topbar">
            <span>
              <i />
              Nexo
            </span>
            <b>Privado</b>
          </div>
          <div className="preview-chat-thread">
            <div className="preview-chat-message preview-chat-user">
              Mañana recuérdame comprar alimento para Milo y aparta $800 del
              presupuesto de la casa.
            </div>
            <div className="preview-chat-message preview-chat-nexo">
              <span>N</span>
              <p>
                Listo. Te lo recordaré mañana. También relacioné el pendiente
                con Milo, el hogar y tu presupuesto mensual.
              </p>
            </div>
            <div className="preview-chat-message preview-chat-user">
              ¿Qué más tengo pendiente esta semana?
            </div>
            <div className="preview-chat-message preview-chat-nexo">
              <span>N</span>
              <p>
                Tienes la cita del jueves y entregar la propuesta a Ana el
                viernes. ¿Quieres que prepare tu semana?
              </p>
            </div>
          </div>
          <div className="preview-chat-composer">
            <span>Escribe lo que tienes en mente…</span>
            <b>↑</b>
          </div>
        </div>
      </section>

      <section className="landing-modules landing-conversation-story">
        <div className="landing-section-heading">
          <span>Sin menús. Sin clasificar antes de hablar.</span>
          <h2>Una sola conversación entiende todos tus temas.</h2>
          <p>
            Tú hablas con naturalidad. Nexo identifica qué ocurrió, cuándo,
            con quién se relaciona y qué debería suceder después.
          </p>
        </div>
        <div className="landing-topic-cloud" aria-label="Temas que Nexo puede conectar">
          {lifeTopics.map((topic) => <span key={topic}>{topic}</span>)}
        </div>
        <div className="landing-flow">
          <article>
            <span>01</span>
            <h3>Dilo</h3>
            <p>Escribe o adjunta lo que acaba de pasar.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Nexo lo entiende</h3>
            <p>Detecta intención, fecha, personas y relaciones.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Úsalo después</h3>
            <p>Pregunta, actualiza o actúa sin volver a explicar el contexto.</p>
          </article>
        </div>
      </section>

      <section className="landing-privacy">
        <span className="landing-privacy-mark">⌁</span>
        <div>
          <span>Privado por diseño</span>
          <h2>Tu información te pertenece.</h2>
          <p>
            Cada conversación está aislada por cuenta. Nexo conserva sólo el
            contexto útil que tú compartes y distingue hechos de inferencias.
          </p>
        </div>
        <Link href="/register">Empezar ahora →</Link>
      </section>

      <footer className="public-footer">
        <Brand />
        <span>Todo tu contexto. Una conversación.</span>
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
              ? "Crea un chat privado que aprende de lo que decides contarle."
              : "Tu conversación y el contexto que decidiste conservar siguen aquí."}
          </p>
        </div>
        <blockquote>
          <span>“</span>
          No tienes que organizar tu vida antes de pedir ayuda.
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
        if (response.status === 401 || response.status === 403) {
          removeBrowserSession();
          return;
        }
        if (!response.ok || !data.user) throw new Error();
        const restored = { ...saved, user: data.user };
        saveBrowserSession(restored);
        if (active) setSession(restored);
      } catch {
        // Keep a locally valid session during temporary API or network failures.
        // Protected requests will still be rejected if the token is truly invalid.
        if (active) setSession(saved);
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
