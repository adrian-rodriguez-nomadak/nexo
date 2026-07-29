import {
  isModuleKey,
  type ModuleKey,
} from "../captures/captures.validation.js";

export const memoryKinds = [
  "fact",
  "event",
  "preference",
  "goal",
  "pattern",
] as const;
export const memorySources = ["omi", "observer", "manual", "derived"] as const;
export const memorySensitivities = [
  "normal",
  "sensitive",
  "restricted",
] as const;
export const memoryStatuses = ["active", "superseded", "rejected"] as const;

export type MemoryKind = (typeof memoryKinds)[number];
export type MemorySource = (typeof memorySources)[number];
export type MemorySensitivity = (typeof memorySensitivities)[number];
export type MemoryStatus = (typeof memoryStatuses)[number];

export function isMemoryKind(value: unknown): value is MemoryKind {
  return (
    typeof value === "string" &&
    memoryKinds.includes(value as MemoryKind)
  );
}

export function isMemorySource(value: unknown): value is MemorySource {
  return (
    typeof value === "string" &&
    memorySources.includes(value as MemorySource)
  );
}

export function isMemorySensitivity(
  value: unknown,
): value is MemorySensitivity {
  return (
    typeof value === "string" &&
    memorySensitivities.includes(value as MemorySensitivity)
  );
}

export function isMemoryStatus(value: unknown): value is MemoryStatus {
  return (
    typeof value === "string" &&
    memoryStatuses.includes(value as MemoryStatus)
  );
}

export function normalizeMemoryContent(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 2 && normalized.length <= 500
    ? normalized
    : null;
}

export function normalizeMemoryConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > 1) return null;
  return Math.round(value * 1000) / 1000;
}

export function normalizeMemoryModule(value: unknown): ModuleKey | null {
  return isModuleKey(value) ? value : null;
}

export function normalizeSourceRecordIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;
  const ids = value.filter(
    (item): item is string =>
      typeof item === "string" && item.length > 0 && item.length <= 100,
  );
  return ids.length === value.length ? [...new Set(ids)] : null;
}
