import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("builds Nexo as a single authenticated conversation", async () => {
  const [dashboard, assistant, layout] = await Promise.all([
    readFile(new URL("app/nexo-dashboard.tsx", projectRoot), "utf8"),
    readFile(new URL("app/assistant-panel.tsx", projectRoot), "utf8"),
    readFile(new URL("app/layout.tsx", projectRoot), "utf8"),
    access(new URL(".next/BUILD_ID", projectRoot)),
  ]);

  assert.match(dashboard, /<AssistantPanel/);
  assert.match(dashboard, /Todo tu contexto, una conversación/);
  assert.doesNotMatch(
    dashboard,
    /FinancesPanel|EventsPanel|NotesPanel|HealthPanel|selectedModule/,
  );
  assert.match(assistant, /\/api\/assistant\/messages/);
  assert.match(assistant, /¿Qué tienes en mente\?/);
  assert.match(assistant, /No necesitas ordenar nada primero/);
  assert.match(assistant, /Cuéntale algo a Nexo/);
  assert.match(assistant, /acceptedFiles/);
  assert.match(assistant, /scrollIntoView/);
  assert.match(layout, /Todo tu contexto, una conversación/);
});

test("presents the public product as one chat instead of separate modules", async () => {
  const portal = await readFile(
    new URL("app/auth-portal.tsx", projectRoot),
    "utf8",
  );

  assert.match(portal, /Una conversación para todo/);
  assert.match(portal, /Cuéntame tu vida/);
  assert.match(portal, /Sin menús\. Sin clasificar antes de hablar/);
  assert.match(portal, /Una sola conversación entiende todos tus temas/);
  assert.match(portal, /Agenda/);
  assert.match(portal, /Finanzas/);
  assert.match(portal, /Personas/);
  assert.doesNotMatch(portal, /productModules|Cada módulo funciona solo/);
});

test("keeps private account authentication around the conversation", async () => {
  const [portal, apiClient, login, register] = await Promise.all([
    readFile(new URL("app/auth-portal.tsx", projectRoot), "utf8"),
    readFile(new URL("app/api-client.ts", projectRoot), "utf8"),
    readFile(new URL("app/login/page.tsx", projectRoot), "utf8"),
    readFile(new URL("app/register/page.tsx", projectRoot), "utf8"),
  ]);

  assert.match(login, /initialView="login"/);
  assert.match(register, /initialView="register"/);
  assert.match(portal, /\/api\/auth\/\$\{isRegister \? "register" : "login"\}/);
  assert.match(portal, /apiFetch\("\/api\/auth\/me"/);
  assert.match(portal, /localStorage/);
  assert.doesNotMatch(portal, /sessionStorage/);
  assert.match(apiClient, /NEXT_PUBLIC_API_URL/);
  assert.match(apiClient, /authorization/);
});

test("includes the assistant-first responsive visual system", async () => {
  const styles = await readFile(
    new URL("app/globals.css", projectRoot),
    "utf8",
  );

  assert.match(styles, /Assistant-first product/);
  assert.match(styles, /\.preview-chat-thread/);
  assert.match(styles, /\.assistant-empty-orbit/);
  assert.match(styles, /\.assistant-composer-live/);
  assert.match(styles, /@media \(max-width: 700px\)/);
});
