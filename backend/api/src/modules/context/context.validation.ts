export const contextTopics = [
  "general",
  "finances",
  "calendar",
  "tasks",
  "people",
  "notes",
  "projects",
  "health",
  "wellbeing",
  "habits",
  "goals",
  "work",
  "learning",
  "home",
  "shopping",
  "travel",
  "food",
  "entertainment",
  "documents",
  "vehicles",
  "journal",
  // Temas heredados que siguen siendo válidos durante la transición.
  "events",
  "bets",
  "meals",
  "gym",
] as const;

export const contextRecordKinds = [
  "fact",
  "task",
  "event",
  "note",
  "transaction",
  "reminder",
  "measurement",
  "goal",
  "preference",
  "decision",
  "document",
  "journal",
  "list_item",
] as const;

export const contextRecordStatuses = [
  "active",
  "pending",
  "completed",
  "cancelled",
  "archived",
] as const;

export type ContextTopic = (typeof contextTopics)[number];
export type ContextRecordKind = (typeof contextRecordKinds)[number];
export type ContextRecordStatus = (typeof contextRecordStatuses)[number];

export function isContextTopic(value: unknown): value is ContextTopic {
  return (
    typeof value === "string" &&
    contextTopics.includes(value as ContextTopic)
  );
}

export function isContextRecordKind(
  value: unknown,
): value is ContextRecordKind {
  return (
    typeof value === "string" &&
    contextRecordKinds.includes(value as ContextRecordKind)
  );
}

export function isContextRecordStatus(
  value: unknown,
): value is ContextRecordStatus {
  return (
    typeof value === "string" &&
    contextRecordStatuses.includes(value as ContextRecordStatus)
  );
}

export function normalizeContextContent(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 2 && normalized.length <= 2_000
    ? normalized
    : null;
}

export function normalizeContextDate(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function normalizeContextEntities(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 12) return null;
  const normalized = value.map((item) =>
    typeof item === "string"
      ? item.trim().replace(/\s+/g, " ").slice(0, 100)
      : ""
  );
  return normalized.every((item) => item.length >= 2)
    ? [...new Set(normalized)]
    : null;
}

export function normalizeContextSearch(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 2 && normalized.length <= 300
    ? normalized
    : null;
}
