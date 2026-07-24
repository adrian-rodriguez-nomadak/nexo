import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("builds the authenticated Nexo dashboard", async () => {
  const [dashboard, apiClient, authSession, chatGPTAuth, layout, page] =
    await Promise.all([
      readFile(new URL("app/nexo-dashboard.tsx", projectRoot), "utf8"),
      readFile(new URL("app/api-client.ts", projectRoot), "utf8"),
      readFile(new URL("app/auth-session.ts", projectRoot), "utf8"),
      readFile(new URL("app/chatgpt-auth.ts", projectRoot), "utf8"),
      readFile(new URL("app/layout.tsx", projectRoot), "utf8"),
      readFile(new URL("app/page.tsx", projectRoot), "utf8"),
      access(new URL("dist/server/index.js", projectRoot)),
    ]);

  assert.match(layout, /Nexo — Tu vida, conectada/);
  assert.match(page, /NexoDashboard/);
  assert.match(dashboard, /Tu día, conectado\./);
  assert.match(dashboard, /Captura rápida/);
  assert.match(dashboard, /Finanzas/);
  assert.match(dashboard, /Gimnasio/);
  assert.match(dashboard, /apiFetch\(\s*"\/api\/captures"/);
  assert.match(apiClient, /NEXT_PUBLIC_API_URL/);
  assert.match(apiClient, /authorization/);
  assert.match(authSession, /x-nexo-auth-secret/);
  assert.match(chatGPTAuth, /process\.env\.NODE_ENV === "production"/);
  assert.match(chatGPTAuth, /NEXO_DEV_USER_EMAIL/);
  assert.match(page, /getChatGPTUser/);
  assert.match(page, /Continuar con ChatGPT/);
  assert.match(apiClient, /http:\/\/localhost:3001/);
  assert.doesNotMatch(
    `${dashboard}${layout}${page}`,
    /codex-preview|react-loading-skeleton/i,
  );
});

test("connects the finance module to the independent API", async () => {
  const panel = await readFile(
    new URL("app/finances-panel.tsx", projectRoot),
    "utf8",
  );

  assert.match(panel, /Registrar dinero/);
  assert.match(panel, /apiFetch\("\/api\/finances", sessionToken\)/);
  assert.match(panel, /"\/api\/finances\/accounts"/);
  assert.match(panel, /"\/api\/finances\/transactions"/);
});

test("connects the events module to the independent API", async () => {
  const panel = await readFile(
    new URL("app/events-panel.tsx", projectRoot),
    "utf8",
  );

  assert.match(panel, /Agregar evento/);
  assert.match(panel, /Mis eventos/);
  assert.match(panel, /apiFetch\("\/api\/events", sessionToken\)/);
  assert.match(panel, /`\/api\/events\/\$\{id\}`/);
  assert.match(panel, /datetime-local/);
});
