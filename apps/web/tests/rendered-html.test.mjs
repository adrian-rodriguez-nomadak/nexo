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

test("connects the notes module to the independent API", async () => {
  const panel = await readFile(
    new URL("app/notes-panel.tsx", projectRoot),
    "utf8",
  );

  assert.match(panel, /Crear nota/);
  assert.match(panel, /Buscar notas/);
  assert.match(panel, /apiFetch\("\/api\/notes", sessionToken\)/);
  assert.match(panel, /method: editingId \? "PATCH" : "POST"/);
  assert.match(panel, /`\/api\/notes\/\$\{id\}`/);
  assert.match(panel, /togglePinned/);
});

test("connects bet image imports to finances and limits", async () => {
  const panel = await readFile(
    new URL("app/bets-panel.tsx", projectRoot),
    "utf8",
  );

  assert.match(panel, /Registrar boleto/);
  assert.match(panel, /Saldo total en Finanzas/);
  assert.match(panel, /Límite mensual/);
  assert.match(panel, /apiFetch\("\/api\/bets", sessionToken\)/);
  assert.match(panel, /"\/api\/bets\/settings"/);
  assert.match(panel, /`\/api\/bets\/\$\{id\}\/status`/);
  assert.match(panel, /Nunca persigas/);
  assert.match(panel, /Cuenta de Finanzas obligatoria/);
  assert.match(panel, /financeAccountId,/);
  assert.match(panel, /Finanzas · \$\{bet\.financeAccountName\}/);
  assert.match(panel, /\["Caliente", "Draftea", "Otro"\]/);
  assert.match(panel, /effectiveOdds/);
  assert.match(panel, /selections\.length > 1/);
  assert.match(panel, /Importar boleto desde imagen/);
  assert.match(panel, /"\/api\/bets\/extract-image"/);
  assert.match(panel, /accept="image\/png,image\/jpeg,image\/webp"/);
});

test("connects meals to macros and finances", async () => {
  const [dashboard, panel] = await Promise.all([
    readFile(new URL("app/nexo-dashboard.tsx", projectRoot), "utf8"),
    readFile(new URL("app/meals-panel.tsx", projectRoot), "utf8"),
  ]);

  assert.match(dashboard, /MealsPanel/);
  assert.match(dashboard, /Tu alimentación, visible\./);
  assert.match(panel, /Agregar comida/);
  assert.match(panel, /Proteína/);
  assert.match(panel, /Cuenta de Finanzas/);
  assert.match(panel, /apiFetch\("\/api\/meals", sessionToken\)/);
  assert.match(panel, /`\/api\/meals\/\$\{id\}`/);
  assert.match(panel, /financeAccountId:/);
  assert.match(panel, /\/api\/meals\/catalog\?q=/);
  assert.match(panel, /Open Food Facts \/ wger/);
  assert.match(panel, /chooseFood/);
});

test("connects gym sessions to exercises and progress", async () => {
  const [dashboard, panel] = await Promise.all([
    readFile(new URL("app/nexo-dashboard.tsx", projectRoot), "utf8"),
    readFile(new URL("app/gym-panel.tsx", projectRoot), "utf8"),
  ]);

  assert.match(dashboard, /GymPanel/);
  assert.match(dashboard, /Tu progreso, medible\./);
  assert.match(panel, /Registrar entrenamiento/);
  assert.match(panel, /Guardar entrenamiento/);
  assert.match(panel, /Volumen/);
  assert.match(panel, /Peso máximo/);
  assert.match(panel, /apiFetch\("\/api\/gym", sessionToken\)/);
  assert.match(panel, /`\/api\/gym\/\$\{id\}`/);
  assert.match(panel, /addExercise/);
  assert.match(panel, /workoutVolume/);
  assert.match(panel, /\/api\/gym\/catalog\?q=/);
  assert.match(panel, /Catálogo gratuito de wger/);
  assert.match(panel, /workoutTitleFromDate/);
  assert.doesNotMatch(panel, /Nombre de la sesión/);
});

test("connects health profile, measurements and history", async () => {
  const [dashboard, panel] = await Promise.all([
    readFile(new URL("app/nexo-dashboard.tsx", projectRoot), "utf8"),
    readFile(new URL("app/health-panel.tsx", projectRoot), "utf8"),
  ]);

  assert.match(dashboard, /import \{ HealthPanel \}/);
  assert.match(dashboard, /selectedModule === "health"/);
  assert.match(dashboard, /setHealthCount/);
  assert.match(panel, /Perfil de salud/);
  assert.match(panel, /Nueva medición/);
  assert.match(panel, /Historial de salud/);
  assert.match(panel, /apiFetch\("\/api\/health", sessionToken\)/);
  assert.match(panel, /"\/api\/health\/profile"/);
  assert.match(panel, /"\/api\/health\/entries"/);
  assert.match(panel, /`\/api\/health\/entries\/\$\{id\}`/);
  assert.match(panel, /no diagnostica/);
});
