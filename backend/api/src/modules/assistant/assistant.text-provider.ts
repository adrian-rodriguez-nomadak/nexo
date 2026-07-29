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

function textProviderConfig(): {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: string;
} {
  if (env.NEXO_TEXT_API_KEY) {
    return {
      apiKey: env.NEXO_TEXT_API_KEY,
      baseUrl: env.NEXO_TEXT_API_URL.replace(/\/+$/, ""),
      model: env.NEXO_TEXT_MODEL,
      provider: env.NEXO_TEXT_PROVIDER,
    };
  }
  if (env.OPENAI_API_KEY) {
    return {
      apiKey: env.OPENAI_API_KEY,
      baseUrl: "https://api.openai.com/v1",
      model: env.OPENAI_ASSISTANT_MODEL,
      provider: "openai",
    };
  }
  throw new Error("NEXO_TEXT_API_KEY_NOT_CONFIGURED");
}

export async function callTextModel(
  messages: TextMessage[],
): Promise<TextModelReply> {
  const provider = textProviderConfig();
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
      ...(provider.provider === "openrouter"
        ? {
            "HTTP-Referer": "https://nexo-chi-nine.vercel.app",
            "X-Title": "Nexo",
          }
        : {}),
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      tools: chatTools,
      tool_choice: "auto",
      temperature: 0.2,
      max_tokens: 1_200,
      ...(provider.provider === "openrouter"
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
