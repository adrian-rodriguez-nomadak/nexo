import {
  isModuleKey,
  type ModuleKey,
} from "../captures/captures.validation.js";

export const observerSubmodules = {
  finances: ["accounts", "transactions", "transfers", "balances"],
  events: ["appointments", "reminders", "reservations", "deadlines"],
  notes: ["ideas", "tasks", "references", "lists"],
  bets: ["tickets", "results", "bankroll", "limits"],
  meals: ["logs", "nutrition", "recipes", "costs"],
  health: ["profile", "sleep", "hydration", "vitals", "symptoms"],
  gym: ["workouts", "strength", "cardio", "mobility"],
} as const satisfies Record<ModuleKey, readonly string[]>;

export type ObserverSubmodule =
  (typeof observerSubmodules)[ModuleKey][number];

export type ObserverScope = {
  module: ModuleKey;
  submodule: ObserverSubmodule;
};

export function isObserverSubmodule(
  module: ModuleKey,
  value: unknown,
): value is ObserverSubmodule {
  return (
    typeof value === "string" &&
    (observerSubmodules[module] as readonly string[]).includes(value)
  );
}

export function normalizeObserverScopes(value: unknown): ObserverScope[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, ObserverScope>();
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const { module, submodule } = candidate as Record<string, unknown>;
    if (!isModuleKey(module) || !isObserverSubmodule(module, submodule)) {
      continue;
    }
    unique.set(`${module}.${submodule}`, { module, submodule });
  }
  return [...unique.values()];
}

export function scopesForModules(modules: ModuleKey[]): ObserverScope[] {
  return modules.flatMap((module) =>
    observerSubmodules[module].map((submodule) => ({ module, submodule })),
  );
}
