export const biologicalSexes = [
  "female",
  "male",
  "intersex",
  "unspecified",
] as const;

export const bloodTypes = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export type BiologicalSex = (typeof biologicalSexes)[number];
export type BloodType = (typeof bloodTypes)[number];

export function normalizeHealthText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > maximumLength) return null;
  return normalized;
}

export function normalizeOptionalHealthText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  return normalizeHealthText(value, maximumLength);
}

export function normalizeHealthList(
  value: unknown,
  maximumItems = 20,
): string[] | null {
  if (!Array.isArray(value) || value.length > maximumItems) return null;

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const text = normalizeHealthText(item, 100);
    if (!text) return null;
    const key = text.toLocaleLowerCase("es-MX");
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(text);
    }
  }
  return normalized;
}

export function normalizeHealthDecimal(
  value: unknown,
  minimum: number,
  maximum: number,
  decimals = 1,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < minimum || value > maximum) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function normalizeHealthInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (!Number.isSafeInteger(value)) return null;
  const integer = value as number;
  return integer >= minimum && integer <= maximum ? integer : null;
}

export function normalizeHealthDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    value < "1900-01-01" ||
    value > new Date().toISOString().slice(0, 10)
  ) {
    return null;
  }
  return value;
}

export function normalizeHealthDateTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

export function isBiologicalSex(value: unknown): value is BiologicalSex {
  return (
    typeof value === "string" &&
    biologicalSexes.includes(value as BiologicalSex)
  );
}

export function isBloodType(value: unknown): value is BloodType {
  return typeof value === "string" && bloodTypes.includes(value as BloodType);
}

export function hasHealthValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}
