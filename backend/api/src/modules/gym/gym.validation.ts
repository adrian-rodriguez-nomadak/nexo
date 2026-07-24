export const exerciseKinds = ["strength", "cardio", "mobility"] as const;

export type ExerciseKind = (typeof exerciseKinds)[number];

export type NormalizedExercise = {
  name: string;
  kind: ExerciseKind;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  distanceKm: number | null;
  durationMinutes: number | null;
  notes: string | null;
};

export function normalizeGymText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > maximumLength) return null;
  return normalized;
}

export function normalizeOptionalGymText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  return normalizeGymText(value, maximumLength);
}

export function normalizeGymDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

export function normalizeOptionalGymInteger(
  value: unknown,
  maximum: number,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (!Number.isSafeInteger(value) || (value as number) < 1) return null;
  return (value as number) <= maximum ? (value as number) : null;
}

export function normalizeOptionalGymDecimal(
  value: unknown,
  maximum: number,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > maximum) return null;
  return Math.round(value * 100) / 100;
}

export function normalizeExercises(
  value: unknown,
): NormalizedExercise[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) {
    return null;
  }

  const exercises: NormalizedExercise[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    const name = normalizeGymText(record.name, 120);
    const kind =
      typeof record.kind === "string" &&
      exerciseKinds.includes(record.kind as ExerciseKind)
        ? (record.kind as ExerciseKind)
        : null;
    const sets = normalizeOptionalGymInteger(record.sets, 100);
    const reps = normalizeOptionalGymInteger(record.reps, 1_000);
    const weightKg = normalizeOptionalGymDecimal(record.weightKg, 2_000);
    const distanceKm = normalizeOptionalGymDecimal(record.distanceKm, 10_000);
    const durationMinutes = normalizeOptionalGymInteger(
      record.durationMinutes,
      1_440,
    );
    const notes = normalizeOptionalGymText(record.notes, 500);
    const providedValues = [
      [record.sets, sets],
      [record.reps, reps],
      [record.weightKg, weightKg],
      [record.distanceKm, distanceKm],
      [record.durationMinutes, durationMinutes],
    ] as const;
    const hasInvalidNumber = providedValues.some(
      ([original, normalized]) =>
        original !== null &&
        original !== undefined &&
        original !== "" &&
        normalized === null,
    );
    const hasNotes =
      record.notes !== null &&
      record.notes !== undefined &&
      record.notes !== "";

    if (
      !name ||
      !kind ||
      hasInvalidNumber ||
      (hasNotes && !notes) ||
      (kind === "strength" && (!sets || !reps)) ||
      (kind === "cardio" && distanceKm === null && durationMinutes === null)
    ) {
      return null;
    }

    exercises.push({
      name,
      kind,
      sets,
      reps,
      weightKg,
      distanceKm,
      durationMinutes,
      notes,
    });
  }

  return exercises;
}

