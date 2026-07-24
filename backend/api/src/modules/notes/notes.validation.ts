const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 30;

export function normalizeNoteTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 120) return null;
  return normalized;
}

export function normalizeNoteContent(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > 10_000) return null;
  return normalized;
}

export function normalizeNoteTags(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_TAGS) return null;

  const tags: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") return null;
    const normalized = item.trim().replace(/\s+/g, " ");
    if (!normalized || normalized.length > MAX_TAG_LENGTH) return null;

    const comparisonKey = normalized.toLocaleLowerCase("es-MX");
    if (seen.has(comparisonKey)) continue;
    seen.add(comparisonKey);
    tags.push(normalized);
  }
  return tags;
}
