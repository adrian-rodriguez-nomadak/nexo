function apiBaseUrl(value: string | undefined) {
  const base = (value ?? "http://localhost:3000/api").replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

const API_URL = apiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

type Envelope<T> = { ok: boolean; data: T; message?: string };

export type Profile = {
  preferred_name: string;
  occupation: string;
  city: string;
  timezone: string;
  life_stage: string;
  priorities: string[];
  routines: string[];
  goals: string[];
  support_preferences: string[];
  additional_context: string;
};

export type Person = {
  user: { id: string; name: string; email: string; currency: string };
  profile: Profile;
  onboarding_completed: boolean;
};

export type Tokens = { access_token: string; refresh_token: string; expires_in: number };

export function getTokens(): Tokens | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("nexo.session");
  if (!raw) return null;
  try { return JSON.parse(raw) as Tokens; } catch { return null; }
}

export function setTokens(tokens: Tokens | null) {
  if (tokens) localStorage.setItem("nexo.session", JSON.stringify(tokens));
  else localStorage.removeItem("nexo.session");
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const tokens = getTokens();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(tokens?.access_token ? { Authorization: `Bearer ${tokens.access_token}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 401 && retry && tokens?.refresh_token) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    });
    if (refreshed.ok) {
      const payload = await refreshed.json() as Envelope<Tokens>;
      setTokens(payload.data);
      return request<T>(path, options, false);
    }
    setTokens(null);
  }
  const payload = await response.json().catch(() => ({ ok: false, message: "No se pudo conectar con Nexo" })) as Envelope<T>;
  if (!response.ok || !payload.ok) throw new Error(payload.message ?? "Ocurrió un error");
  return payload.data;
}

export const api = {
  login: (email: string, password: string) => request<{ user: Person["user"]; tokens: Tokens }>("/auth/login", {
    method: "POST", body: JSON.stringify({ email, password, device_name: "Nexo Web" }),
  }),
  me: () => request<Person>("/users/me"),
  updateProfile: (profile: Profile, complete_onboarding = false) => request<Person>("/users/me/profile", {
    method: "PUT", body: JSON.stringify({ ...profile, complete_onboarding }),
  }),
  dashboard: async () => {
    const settled = await Promise.allSettled([
      request<unknown>("/finances/summary"), request<unknown[]>("/tasks"),
      request<unknown[]>("/calendar/events"), request<unknown[]>("/subscriptions"),
    ]);
    return settled.map((result) => result.status === "fulfilled" ? result.value : null);
  },
};
