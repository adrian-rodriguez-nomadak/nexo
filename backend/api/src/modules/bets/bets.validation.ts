export const betStatuses = ["pending", "won", "lost", "void"] as const;
export const sportsbooks = ["Caliente", "Draftea", "Otro"] as const;

export type BetStatus = (typeof betStatuses)[number];
export type Sportsbook = (typeof sportsbooks)[number];

export type NormalizedBetSelection = {
  event: string;
  selection: string;
  market: string | null;
  decimalOdds: number;
};

export function isBetStatus(value: unknown): value is BetStatus {
  return (
    typeof value === "string" &&
    betStatuses.includes(value as BetStatus)
  );
}

export function isSportsbook(value: unknown): value is Sportsbook {
  return (
    typeof value === "string" &&
    sportsbooks.includes(value as Sportsbook)
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

export function normalizeBetSelections(
  value: unknown,
): NormalizedBetSelection[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 20) {
    return null;
  }

  const selections: NormalizedBetSelection[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    const event = normalizeBetText(record.event, 160);
    const selection = normalizeBetText(record.selection, 120);
    const market = normalizeOptionalBetText(record.market, 100);
    const hasMarket =
      record.market !== null &&
      record.market !== undefined &&
      record.market !== "";
    const decimalOdds = normalizeBetOdds(record.decimalOdds);
    if (!event || !selection || (hasMarket && !market) || !decimalOdds) {
      return null;
    }
    selections.push({ event, selection, market, decimalOdds });
  }

  return combinedBetOdds(selections) ? selections : null;
}

export function combinedBetOdds(
  selections: readonly Pick<NormalizedBetSelection, "decimalOdds">[],
): number | null {
  if (selections.length < 2) return null;
  const combined = selections.reduce(
    (total, selection) => total * selection.decimalOdds,
    1,
  );
  if (!Number.isFinite(combined) || combined > 1_000) return null;
  return Math.round(combined * 1_000) / 1_000;
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

export function betPayoutCents(
  stakeCents: number,
  decimalOdds: number,
  status: BetStatus,
): number | null {
  if (status === "won") return Math.round(stakeCents * decimalOdds);
  if (status === "void") return stakeCents;
  return null;
}
