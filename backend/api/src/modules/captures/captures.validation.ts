export const moduleKeys = [
  "finances",
  "events",
  "notes",
  "bets",
  "meals",
  "health",
  "gym",
] as const;

export type ModuleKey = (typeof moduleKeys)[number];

export function isModuleKey(value: unknown): value is ModuleKey {
  return (
    typeof value === "string" && moduleKeys.includes(value as ModuleKey)
  );
}

export function normalizeCaptureContent(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 500) return null;
  return normalized;
}
