export const betStatuses = ["pending", "won", "lost", "void"] as const;

export type BetStatus = (typeof betStatuses)[number];

export function isBetStatus(value: unknown): value is BetStatus {
  return (
    typeof value === "string" &&
    betStatuses.includes(value as BetStatus)
  );
}

export function normalizeBetText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > maximumLength) return null;
  return normalized;
}

export function normalizeOptionalBetText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  return normalizeBetText(value, maximumLength);
}

export function normalizeBetOdds(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 1.01 || value > 1_000) return null;
  return Math.round(value * 1_000) / 1_000;
}

export function isValidBetCents(
  value: unknown,
  options: { allowZero?: boolean } = {},
): value is number {
  if (!Number.isSafeInteger(value)) return false;
  if ((value as number) < 0 || (value as number) > 100_000_000_000) {
    return false;
  }
  return options.allowZero ? true : (value as number) > 0;
}

export function normalizeBetDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}
