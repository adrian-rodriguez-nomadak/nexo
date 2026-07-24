export type ProgressDays = 7 | 30;

export function normalizeProgressDays(value: unknown): ProgressDays {
  return value === "7" || value === 7 ? 7 : 30;
}
