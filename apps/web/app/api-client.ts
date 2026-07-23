const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(
  /\/+$/,
  "",
);
const defaultApiUrl =
  process.env.NODE_ENV === "production"
    ? "https://nexo-api-2gbp.onrender.com"
    : "http://localhost:3001";

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${configuredApiUrl || defaultApiUrl}${normalizedPath}`;
}
