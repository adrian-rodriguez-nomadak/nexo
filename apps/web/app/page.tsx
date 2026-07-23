import { exchangeChatGPTIdentity } from "./auth-session";
import {
  chatGPTSignInPath,
  chatGPTSignOutPath,
  getChatGPTUser,
} from "./chatgpt-auth";
import { NexoDashboard } from "./nexo-dashboard";

export const dynamic = "force-dynamic";

function AccessScreen({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <main className="access-shell">
      <section className="access-card">
        <div className="brand access-brand">
          <span className="brand-mark">N</span>
          <span>Nexo</span>
        </div>
        <span className="eyebrow">Tu espacio personal</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <a className="access-action" href={actionHref}>
          {actionLabel}
          <span aria-hidden="true">→</span>
        </a>
        <small>Tu información permanece separada de la de otros usuarios.</small>
      </section>
    </main>
  );
}

export default async function Home() {
  const user = await getChatGPTUser();
  if (!user) {
    return (
      <AccessScreen
        actionHref={chatGPTSignInPath("/")}
        actionLabel="Continuar con ChatGPT"
        description="Inicia sesión para conectar tus finanzas, notas, eventos y bienestar en un solo lugar."
        title="Tu vida, conectada y privada."
      />
    );
  }

  let session;
  try {
    session = await exchangeChatGPTIdentity(user);
  } catch (error) {
    console.error("Unable to create Nexo session", error);
    return (
      <AccessScreen
        actionHref="/"
        actionLabel="Intentar de nuevo"
        description="Tu identidad está protegida, pero el servicio de datos no respondió. Intenta nuevamente en un momento."
        title="No pudimos abrir tu espacio."
      />
    );
  }

  return (
    <NexoDashboard
      sessionToken={session.token}
      signOutPath={chatGPTSignOutPath("/")}
      user={user}
    />
  );
}
