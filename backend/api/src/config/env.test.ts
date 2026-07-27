import assert from "node:assert/strict";
import test from "node:test";

import { parseCorsOrigins } from "./env.js";

test("keeps official CORS origins when additional origins are configured", () => {
  const origins = parseCorsOrigins(
    " https://preview.example.com/, http://localhost:3000/, * ",
  );

  assert.equal(origins.includes("https://nexo-chi-nine.vercel.app"), true);
  assert.equal(origins.includes("https://preview.example.com"), true);
  assert.equal(origins.includes("http://localhost:3000"), true);
  assert.equal(origins.includes("http://localhost:3000/"), false);
  assert.equal(origins.includes("*"), true);
  assert.equal(
    origins.filter((origin) => origin === "http://localhost:3000").length,
    1,
  );
});
