import { createHash } from "node:crypto";

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 5 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function normalizeDisplayName(
  value: unknown,
  email: string,
): string {
  if (typeof value !== "string") return email.split("@")[0] ?? "Usuario";
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 100) {
    return email.split("@")[0] ?? "Usuario";
  }
  return normalized;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
