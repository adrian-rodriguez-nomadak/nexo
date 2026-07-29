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

function fileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}
export function normalizeAssistantMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const message = value.trim();
  return message.length > 0 && message.length <= 8_000 ? message : null;
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
