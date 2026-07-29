import { env } from "../../config/env.js";
import { assistantTools } from "./assistant.tools.js";

export type TextMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: TextToolCall[];
};

export type TextToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type TextModelReply = {
  content: string | null;
  toolCalls: TextToolCall[];
  rawMessage: TextMessage;
};

const chatTools = assistantTools.map((tool) => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    strict: tool.strict,
  },
}));

export async function callTextModel(
  messages: TextMessage[],
): Promise<TextModelReply> {
  if (!env.NEXO_TEXT_API_KEY) throw new Error("NEXO_TEXT_API_KEY_NOT_CONFIGURED");
  const baseUrl = env.NEXO_TEXT_API_URL.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.NEXO_TEXT_API_KEY}`,
      "Content-Type": "application/json",
      ...(env.NEXO_TEXT_PROVIDER === "openrouter"
        ? {
            "HTTP-Referer": "https://nexo-chi-nine.vercel.app",
            "X-Title": "Nexo",
          }
        : {}),
    },
    body: JSON.stringify({
      model: env.NEXO_TEXT_MODEL,
      messages,
      tools: chatTools,
      tool_choice: "auto",
      temperature: 0.2,
      max_tokens: 1_200,
      ...(env.NEXO_TEXT_PROVIDER === "openrouter"
        ? {
            provider: {
              zdr: true,
              data_collection: "deny",
            },
          }
        : {}),
    }),
  });
  const payload = await response.json() as {
    error?: { message?: string };
    choices?: Array<{
      message?: {
        role?: string;
        content?: unknown;
        tool_calls?: unknown;
      };
    }>;
  };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "TEXT_MODEL_REQUEST_FAILED");
  }
  const message = payload.choices?.[0]?.message;
  if (!message) throw new Error("TEXT_MODEL_EMPTY");
  const toolCalls = Array.isArray(message.tool_calls)
    ? message.tool_calls.filter(
        (call): call is TextToolCall =>
          typeof call === "object" &&
          call !== null &&
          typeof (call as TextToolCall).id === "string" &&
          (call as TextToolCall).type === "function" &&
          typeof (call as TextToolCall).function?.name === "string" &&
          typeof (call as TextToolCall).function?.arguments === "string",
      )
    : [];
  const content = typeof message.content === "string"
    ? message.content.trim() || null
    : null;
  return {
    content,
    toolCalls,
    rawMessage: {
      role: "assistant",
      content,
      ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
    },
  };
}
