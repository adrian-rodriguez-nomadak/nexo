export const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;

export type MealType = (typeof mealTypes)[number];

export function isMealType(value: unknown): value is MealType {
  return typeof value === "string" && mealTypes.includes(value as MealType);
}

export function normalizeMealText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > maximumLength) return null;
  return normalized;
}

export function normalizeOptionalMealText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  return normalizeMealText(value, maximumLength);
}

export function normalizeMealDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

export function normalizeOptionalMealInteger(
  value: unknown,
  maximum: number,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (!Number.isSafeInteger(value) || (value as number) < 0) return null;
  return (value as number) <= maximum ? (value as number) : null;
}

export function normalizeOptionalMealDecimal(
  value: unknown,
  maximum: number,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > maximum) return null;
  return Math.round(value * 10) / 10;
}

