"use client";

import {
  ArrowRight,
  BarChart3,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";

import { api, getTokens, Person, setTokens } from "../lib/api";
import SportsView from "./sports-view";

function Mark() {
  return (
    <div className="mark">
      <span />
      <i />
      <b />
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<"loading" | "login" | "sports">("loading");
  const [person, setPerson] = useState<Person | null>(null);

  async function load() {
    try {
      const next = await api.me();
      setPerson(next);
      setView("sports");
    } catch {
      setTokens(null);
      setView("login");
    }
  }

  useEffect(() => {
    if (getTokens()) void load();
    else setView("login");
  }, []);

  if (view === "loading") {
    return (
      <main className="sports-boot">
        <Mark />
        <strong>Nexo Sports</strong>
        <p>Sincronizando la jornada…</p>
      </main>
    );
  }

  if (view === "login") return <SportsLogin onSuccess={load} />;
  if (!person) return null;

  return (
    <main className="nexo-sports-app">
      <header className="sports-app-bar">
        <div className="sports-app-brand">
          <Mark />
          <div>
            <strong>Nexo Sports</strong>
            <span>Liga MX Intelligence</span>
          </div>
        </div>
        <div className="sports-app-league">
          <Trophy size={15} />
          Liga MX · Apertura 2026
        </div>
        <div className="sports-app-account">
          <div>
            <strong>{person.user.name}</strong>
            <span>{person.user.email}</span>
          </div>
          <button
            onClick={() => {
              setTokens(null);
              setPerson(null);
              setView("login");
            }}
          >
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </header>
      <section className="sports-page-content">
        <SportsView />
      </section>
    </main>
  );
}

function SportsLogin({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.login(email, password);
      setTokens(result.tokens);
      await onSuccess();
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "No pudimos iniciar sesión.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="sports-login">
      <section className="sports-login-story">
        <nav>
          <div className="sports-app-brand light">
            <Mark />
            <div>
              <strong>Nexo Sports</strong>
              <span>Liga MX Intelligence</span>
            </div>
          </div>
          <span className="sports-login-season">APERTURA 2026</span>
        </nav>
        <div className="sports-login-copy">
          <span>ANÁLISIS ANTES QUE IMPULSO</span>
          <h1>
            El partido completo,
            <br />
            <em>antes de apostar.</em>
          </h1>
          <p>
            Calendario, forma, tabla, bajas, clima y riesgo de bankroll en una
            sola lectura de Liga MX.
          </p>
        </div>
        <div className="sports-login-signals">
          <div>
            <BarChart3 size={18} />
            <span>
              <strong>Modelo estadístico</strong>
              Probabilidades explicables
            </span>
          </div>
          <div>
            <ShieldCheck size={18} />
            <span>
              <strong>Riesgo responsable</strong>
              Límites antes de jugar
            </span>
          </div>
        </div>
      </section>
      <section className="sports-login-panel">
        <form onSubmit={submit}>
          <span className="sports-kicker">
            <span /> ACCESO PRIVADO
          </span>
          <h2>Entra a Nexo Sports</h2>
          <p>Usa tu cuenta de Nexo para conservar tus análisis.</p>
          <label>
            Correo electrónico
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="sports-login-submit" disabled={busy}>
            {busy ? (
              "Entrando…"
            ) : (
              <>
                Entrar <ArrowRight size={18} />
              </>
            )}
          </button>
          <small>
            <LockKeyhole size={13} />
            Sesión protegida y datos privados.
          </small>
        </form>
      </section>
    </main>
  );
}
