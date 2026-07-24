const MAX_EVENT_DURATION_MS = 366 * 24 * 60 * 60 * 1000;

export function normalizeEventText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > maximumLength) return null;
  return normalized;
}

export function normalizeOptionalEventText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  return normalizeEventText(value, maximumLength);
}

export function normalizeEventDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

export function isValidEventRange(
  startsAt: string,
  endsAt: string | null,
): boolean {
  if (!endsAt) return true;

  const duration = Date.parse(endsAt) - Date.parse(startsAt);
  return duration > 0 && duration <= MAX_EVENT_DURATION_MS;
}
