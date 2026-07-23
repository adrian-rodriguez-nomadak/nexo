export const accountTypes = ["cash", "bank", "savings", "credit"] as const;
export const transactionKinds = ["income", "expense"] as const;

export type AccountType = (typeof accountTypes)[number];
export type TransactionKind = (typeof transactionKinds)[number];

export function normalizeLabel(
  value: unknown,
  maximumLength = 80,
): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > maximumLength) return null;
  return normalized;
}

export function isAccountType(value: unknown): value is AccountType {
  return (
    typeof value === "string" &&
    accountTypes.includes(value as AccountType)
  );
}

export function isTransactionKind(
  value: unknown,
): value is TransactionKind {
  return (
    typeof value === "string" &&
    transactionKinds.includes(value as TransactionKind)
  );
}

export function isValidCents(
  value: unknown,
  options: { allowNegative?: boolean } = {},
): value is number {
  if (!Number.isSafeInteger(value)) return false;
  if (Math.abs(value as number) > 100_000_000_000) return false;
  return options.allowNegative ? true : (value as number) > 0;
}

export function normalizeOccurredAt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}
