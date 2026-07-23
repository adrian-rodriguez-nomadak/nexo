import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("builds the finished Nexo dashboard", async () => {
  const [dashboard, layout, page] = await Promise.all([
    readFile(new URL("app/nexo-dashboard.tsx", projectRoot), "utf8"),
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
  assert.match(dashboard, /fetch\("\/api\/captures"/);
  assert.doesNotMatch(
    `${dashboard}${layout}${page}`,
    /codex-preview|react-loading-skeleton/i,
  );
});

test("defines persistent capture routes and removes the starter preview", async () => {
  const [captureRoute, captureStore, schema, migration, previewFiles] =
    await Promise.all([
      readFile(new URL("app/api/captures/route.ts", projectRoot), "utf8"),
      readFile(new URL("db/captures.ts", projectRoot), "utf8"),
      readFile(new URL("db/schema.ts", projectRoot), "utf8"),
      readFile(
        new URL("drizzle/0000_giant_kabuki.sql", projectRoot),
        "utf8",
      ),
      readdir(new URL("app/_sites-preview", projectRoot)),
    ]);

  assert.match(captureRoute, /export async function GET/);
  assert.match(captureRoute, /export async function POST/);
  assert.match(captureStore, /CREATE TABLE IF NOT EXISTS captures/);
  assert.match(schema, /sqliteTable\(\s*"captures"/);
  assert.match(migration, /CREATE TABLE `captures`/);
  assert.deepEqual(previewFiles, []);
});

test("defines the persistent finance module end to end", async () => {
  const [panel, financeRoute, accountRoute, transactionRoute, store, migration] =
    await Promise.all([
      readFile(new URL("app/finances-panel.tsx", projectRoot), "utf8"),
      readFile(new URL("app/api/finances/route.ts", projectRoot), "utf8"),
      readFile(
        new URL("app/api/finances/accounts/route.ts", projectRoot),
        "utf8",
      ),
      readFile(
        new URL("app/api/finances/transactions/route.ts", projectRoot),
        "utf8",
      ),
      readFile(new URL("db/finances.ts", projectRoot), "utf8"),
      readFile(
        new URL("drizzle/0001_spotty_dragon_lord.sql", projectRoot),
        "utf8",
      ),
    ]);

  assert.match(panel, /Registrar dinero/);
  assert.match(panel, /fetch\("\/api\/finances"/);
  assert.match(financeRoute, /export async function GET/);
  assert.match(accountRoute, /export async function POST/);
  assert.match(transactionRoute, /export async function POST/);
  assert.match(store, /CREATE TABLE IF NOT EXISTS finance_accounts/);
  assert.match(store, /CREATE TABLE IF NOT EXISTS finance_transactions/);
  assert.match(migration, /CREATE TABLE `finance_accounts`/);
  assert.match(migration, /CREATE TABLE `finance_transactions`/);
});
