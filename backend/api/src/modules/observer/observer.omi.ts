import { env } from "../../config/env.js";
import type { ModuleKey } from "../captures/captures.validation.js";

export async function createOmiMemory(input: {
  module: ModuleKey;
  content: string;
}): Promise<boolean> {
  if (!env.OMI_API_KEY) return false;

  const response = await fetch("https://api.omi.me/v1/dev/user/memories", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OMI_API_KEY}`,
      "content-type": "application/json",
    },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      content: input.content,
      category: "interesting",
      visibility: "private",
      tags: ["nexo", "observer", input.module],
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: string;
      error?: string;
    } | null;
    throw new Error(
      payload?.detail ?? payload?.error ?? "OMI_MEMORY_SYNC_FAILED",
    );
  }
  return true;
}
