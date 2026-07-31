export type AssistantMetric = {
  label: string;
  value: string;
  detail?: string;
};

export type AssistantChartPoint = {
  label: string;
  value: number;
};

export type AssistantVisualBlock =
  | { type: "metric_row"; items: AssistantMetric[] }
  | { type: "data_table"; title?: string; columns: string[]; rows: string[][] }
  | { type: "bar_chart" | "line_chart"; title?: string; points: AssistantChartPoint[]; unit?: string }
  | { type: "progress"; label: string; value: number; displayValue?: string }
  | { type: "alert"; tone: "info" | "warning" | "success"; title?: string; message: string };

export type AssistantResponse = {
  answer: string;
  blocks: AssistantVisualBlock[];
};

const text = (value: unknown, max = 120): string | null =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : null;

const finiteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function normalizeBlock(value: unknown): AssistantVisualBlock | null {
  if (!value || typeof value !== "object") return null;
  const block = value as Record<string, unknown>;
  const type = text(block.type, 30);
  const title = text(block.title, 80) ?? undefined;

  if (type === "metric_row" && Array.isArray(block.items)) {
    const items = block.items.slice(0, 4).flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const item = raw as Record<string, unknown>;
      const label = text(item.label, 40);
      const itemValue = text(item.value, 40);
      if (!label || !itemValue) return [];
      return [{ label, value: itemValue, detail: text(item.detail, 60) ?? undefined }];
    });
    return items.length ? { type, items } : null;
  }

  if (type === "data_table" && Array.isArray(block.columns) && Array.isArray(block.rows)) {
    const columns = block.columns.slice(0, 5).flatMap((item) => text(item, 40) ?? []);
    const rows = block.rows.slice(0, 12).flatMap((raw) => {
      if (!Array.isArray(raw)) return [];
      return [columns.map((_, index) => text(raw[index], 80) ?? "")];
    });
    return columns.length && rows.length ? { type, title, columns, rows } : null;
  }

  if ((type === "bar_chart" || type === "line_chart") && Array.isArray(block.points)) {
    const points = block.points.slice(0, 12).flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const point = raw as Record<string, unknown>;
      const label = text(point.label, 30);
      const pointValue = finiteNumber(point.value);
      return label && pointValue !== null ? [{ label, value: pointValue }] : [];
    });
    return points.length > 1
      ? { type, title, points, unit: text(block.unit, 12) ?? undefined }
      : null;
  }

  if (type === "progress") {
    const label = text(block.label, 60);
    const number = finiteNumber(block.value);
    return label && number !== null
      ? { type, label, value: Math.max(0, Math.min(1, number)), displayValue: text(block.displayValue, 30) ?? undefined }
      : null;
  }

  if (type === "alert") {
    const message = text(block.message, 240);
    const tone = block.tone === "warning" || block.tone === "success" ? block.tone : "info";
    return message ? { type, tone, title, message } : null;
  }
  return null;
}

export function parseAssistantResponse(content: string): AssistantResponse {
  const candidate = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const decoded = JSON.parse(candidate) as Record<string, unknown>;
    const answer = text(decoded.answer, 8_000);
    if (!answer) return { answer: content, blocks: [] };
    const blocks = Array.isArray(decoded.blocks)
      ? decoded.blocks.slice(0, 5).flatMap((block) => normalizeBlock(block) ?? [])
      : [];
    return { answer, blocks };
  } catch {
    return { answer: content, blocks: [] };
  }
}
