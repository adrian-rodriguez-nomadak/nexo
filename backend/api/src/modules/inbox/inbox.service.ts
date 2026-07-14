import { requireUserId } from "../../shared/auth/user-context.js";
import { moduleHealth } from "../../shared/utils/api-response.js";
import { InboxAction } from "./inbox-action.model.js";
import { aiService } from "../ai/ai.service.js";

function detectIntent(text: string) {
  const normalized = text.toLocaleLowerCase("es-MX");
  if (normalized.includes("gasté") || normalized.includes("gaste")) {
    return "create_expense";
  }
  if (normalized.includes("recuérdame") || normalized.includes("recordar")) {
    return "create_reminder";
  }
  if (normalized.includes("me deben")) {
    return "create_debt";
  }
  if (normalized.includes("cita") || normalized.includes("evento")) {
    return "create_event";
  }
  return "unknown";
}

function payloadFor(intent: string, text: string) {
  const amountMatch = text.match(/\d+([.,]\d+)?/);
  const amount = amountMatch ? Number(amountMatch[0].replace(",", ".")) : null;

  if (intent === "create_expense") {
    return {
      type: "expense",
      amount,
      description: text,
      movement_date: new Date().toISOString().slice(0, 10),
    };
  }
  if (intent === "create_reminder") {
    return {
      title: text,
      remind_at: new Date().toISOString(),
      repeat_type: "none",
    };
  }
  if (intent === "create_debt") {
    return {
      name: "Pendiente por identificar",
      type: "they_owe_me",
      total_amount: amount,
      pending_amount: amount,
      notes: text,
    };
  }
  if (intent === "create_event") {
    return {
      title: text,
      start_at: new Date().toISOString(),
      repeat_type: "none",
    };
  }
  return { text };
}

export const inboxService = {
  health() {
    return moduleHealth("inbox");
  },

  async interpret(text: string) {
    const userId = requireUserId();
    let interpreted: Awaited<ReturnType<typeof aiService.interpretAction>> =
      null;
    try {
      interpreted = await aiService.interpretAction(text, userId);
    } catch (error) {
      console.error(
        "OpenAI interpretation failed; using local fallback",
        error,
      );
    }
    const fallbackIntent = detectIntent(text);
    const actions = interpreted?.actions ?? [
      {
        intent: fallbackIntent,
        title: text,
        preview:
          "Interpretación local preparada; revisa los datos antes de guardar.",
        confidence: fallbackIntent === "unknown" ? 0.2 : 0.7,
        payload: payloadFor(fallbackIntent, text),
      },
    ];
    const primary = actions[0];

    await InboxAction.create({
      user_id: userId,
      raw_text: text,
      detected_intent: primary.intent,
      structured_payload: { actions },
      status: "draft",
    });

    return {
      ...primary,
      actions,
      source: interpreted?.source ?? "local",
    };
  },
};
