const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 5;

const acceptedExtensions = new Set([
  "pdf", "txt", "md", "markdown", "json", "html", "xml", "csv", "tsv",
  "doc", "docx", "rtf", "odt", "ppt", "pptx", "xls", "xlsx",
  "js", "mjs", "ts", "tsx", "jsx", "py", "sql", "css", "eml", "ics",
  "png", "jpg", "jpeg", "webp", "gif",
]);

export type AssistantFile = {
  name: string;
  mimeType: string;
  dataUrl: string;
  size: number;
  kind: "image" | "file";
};

export type AssistantHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

function normalizeConfirmationText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("es-MX")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

function isExplicitConfirmation(value: string): boolean {
  return /^(confirmo|confirmado|correcto|si,? (confirmo|registrar|registralo)|registralo|adelante|hazlo|autorizo (?:que se registren|registrar) (?:estos|los) datos(?: financieros)?)[.! ]*$/.test(
    normalizeConfirmationText(value),
  );
}

function requestsConfirmation(value: string): boolean {
  return /(confirmas|confirma|quieres que lo registre|puedo registrarlo)/i.test(
    value,
  );
}

function findLastMessageIndex(
  history: AssistantHistoryMessage[],
  role: AssistantHistoryMessage["role"],
  before = history.length,
): number {
  for (let index = before - 1; index >= 0; index -= 1) {
    if (history[index]!.role === role) return index;
  }
  return -1;
}

export function buildAssistantHistory(
  history: AssistantHistoryMessage[],
): Array<Record<string, unknown>> {
  return history.map((message) => ({
    role: message.role,
    content: [
      {
        type: message.role === "assistant" ? "output_text" : "input_text",
        text: message.content,
      },
    ],
  }));
}

export function extractAssistantText(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const response = payload as {
    output?: unknown;
    output_text?: unknown;
  };
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }
  if (!Array.isArray(response.output)) return null;

  const chunks: string[] = [];
  for (const item of response.output) {
    if (typeof item !== "object" || item === null) continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (typeof part !== "object" || part === null) continue;
      const value = part as { text?: unknown; refusal?: unknown };
      if (typeof value.text === "string") chunks.push(value.text);
      else if (typeof value.refusal === "string") chunks.push(value.refusal);
    }
  }
  return chunks.join("\n").trim() || null;
}

export function hasExplicitConfirmation(
  message: string,
  history: AssistantHistoryMessage[],
): boolean {
  const lastAssistantIndex = findLastMessageIndex(history, "assistant");
  if (
    isExplicitConfirmation(message) &&
    lastAssistantIndex >= 0 &&
    requestsConfirmation(history[lastAssistantIndex]!.content)
  ) {
    return true;
  }

  const retryRequested =
    /^(intenta(?:lo)? de nuevo|vuelve a intentar(?:lo)?|reintenta(?:lo)?)[.! ]*$/.test(
      normalizeConfirmationText(message),
    );
  if (!retryRequested) return false;

  const lastUserIndex = findLastMessageIndex(history, "user");
  if (lastUserIndex < 0 || !isExplicitConfirmation(history[lastUserIndex]!.content)) {
    return false;
  }
  const proposalIndex = findLastMessageIndex(history, "assistant", lastUserIndex);
  const proposal = proposalIndex >= 0 ? history[proposalIndex] : undefined;
  const failedAttempt = history
    .slice(lastUserIndex + 1)
    .some(
      (item) =>
        item.role === "assistant" &&
        /(no se guard|a[uú]n no se guard|rechaz|confirmaci[oó]n adicional|volvi[oó] a pedir)/i.test(
          item.content,
        ),
    );
  return Boolean(
    proposal &&
      requestsConfirmation(proposal.content) &&
      failedAttempt,
  );
}

function fileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}
export function normalizeAssistantMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const message = value.trim();
  return message.length > 0 && message.length <= 8_000 ? message : null;
}

export function normalizeAssistantTimeZone(value: unknown): string {
  if (typeof value !== "string" || value.length > 100) return "UTC";
  try {
    new Intl.DateTimeFormat("es-MX", { timeZone: value }).format();
    return value;
  } catch {
    return "UTC";
  }
}

export function normalizeAssistantHistory(
  value: unknown,
): AssistantHistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-10)
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      role: item.role === "assistant" ? "assistant" as const : "user" as const,
      content: typeof item.content === "string"
        ? item.content.trim().slice(0, 4_000)
        : "",
    }))
    .filter((item) => item.content.length > 0);
}

export function normalizeAssistantFiles(value: unknown): AssistantFile[] | null {
  if (!Array.isArray(value) || value.length > MAX_FILES) return null;

  let totalBytes = 0;
  const files: AssistantFile[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) return null;
    const item = raw as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim().slice(0, 180) : "";
    const mimeType =
      typeof item.mimeType === "string" ? item.mimeType.trim().toLowerCase() : "";
    const dataUrl = typeof item.dataUrl === "string" ? item.dataUrl : "";
    const size = Number(item.size);
    const extension = fileExtension(name);
    const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(extension);

    if (
      !name ||
      !acceptedExtensions.has(extension) ||
      !Number.isInteger(size) ||
      size <= 0 ||
      size > MAX_FILE_BYTES ||
      !dataUrl.startsWith(`data:${mimeType};base64,`)
    ) {
      return null;
    }
    totalBytes += size;
    if (totalBytes > MAX_TOTAL_FILE_BYTES) return null;
    files.push({
      name,
      mimeType,
      dataUrl,
      size,
      kind: isImage ? "image" : "file",
    });
  }
  return files;
}
