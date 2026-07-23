import type { ChatGPTUser } from "./chatgpt-auth";

type NexoSession = {
  token: string;
  expiresAt: string;
};

const defaultApiUrl =
  process.env.NODE_ENV === "production"
    ? "https://nexo-api-2gbp.onrender.com"
    : "http://localhost:3001";

export async function exchangeChatGPTIdentity(
  user: ChatGPTUser,
): Promise<NexoSession> {
  const apiUrl = (
    process.env.NEXO_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    defaultApiUrl
  ).replace(/\/+$/, "");
  const secret = process.env.NEXO_AUTH_SHARED_SECRET;

  if (!secret) {
    throw new Error("NEXO_AUTH_SHARED_SECRET is not configured.");
  }

  const response = await fetch(`${apiUrl}/api/auth/siwc`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-nexo-auth-secret": secret,
    },
    body: JSON.stringify({
      email: user.email,
      displayName: user.fullName ?? user.displayName,
    }),
  });

  if (!response.ok) {
    throw new Error(`Nexo API identity exchange failed with ${response.status}.`);
  }

  return (await response.json()) as NexoSession;
}
