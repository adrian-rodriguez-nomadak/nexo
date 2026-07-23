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
