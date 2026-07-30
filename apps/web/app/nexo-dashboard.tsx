"use client";

import { apiFetch } from "./api-client";
import { AssistantPanel } from "./assistant-panel";

type DashboardUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

function userInitials(user: DashboardUser): string {
  const source = user.fullName ?? user.displayName ?? user.email.split("@")[0] ?? "N";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function NexoDashboard({
  onSignOut,
  sessionToken,
  signOutPath,
  user,
}: {
  onSignOut?: () => void;
  sessionToken: string;
  signOutPath: string;
  user: DashboardUser;
}) {
  async function signOut() {
    try {
      await apiFetch("/api/auth/logout", sessionToken, { method: "POST" });
    } finally {
      onSignOut?.();
      window.location.assign(signOutPath);
    }
  }

  return (
    <main className="chat-only-app">
      <header className="chat-only-bar">
        <div className="chat-only-brand">
          <span aria-hidden="true">N</span>
          <div>
            <strong>Nexo</strong>
            <small>Todo tu contexto, una conversación</small>
          </div>
        </div>
        <div className="chat-only-account">
          <span className="chat-only-private"><i /> Privado</span>
          <span className="chat-only-user">{userInitials(user)}</span>
          <button
            aria-label="Cerrar sesión"
            onClick={() => void signOut()}
            title="Cerrar sesión"
            type="button"
          >
            Salir
          </button>
        </div>
      </header>
      <AssistantPanel
        displayName={user.displayName}
        sessionToken={sessionToken}
      />
    </main>
  );
}
