import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";
import { createMeal, deleteMeal, getMeals } from "./meals.service.js";
import {
  isMealType,
  normalizeMealDate,
  normalizeMealText,
  normalizeOptionalMealDecimal,
  normalizeOptionalMealInteger,
  normalizeOptionalMealText,
} from "./meals.validation.js";

export const mealsRouter = Router();

mealsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    response.json(await getMeals(request.authUser!.id));
  }),
);

mealsRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const {
      name,
      type,
      notes,
      calories,
      proteinGrams,
      carbsGrams,
      fatGrams,
      costCents,
      financeAccountId,
      eatenAt,
    } = (request.body ?? {}) as Record<string, unknown>;
    const normalizedName = normalizeMealText(name, 160);
    const normalizedNotes = normalizeOptionalMealText(notes, 1000);
    const normalizedCalories = normalizeOptionalMealInteger(calories, 20_000);
    const normalizedProtein = normalizeOptionalMealDecimal(proteinGrams, 2_000);
    const normalizedCarbs = normalizeOptionalMealDecimal(carbsGrams, 2_000);
    const normalizedFat = normalizeOptionalMealDecimal(fatGrams, 2_000);
    const normalizedCost = normalizeOptionalMealInteger(costCents, 100_000_000);
    const normalizedEatenAt = normalizeMealDate(eatenAt);
    const normalizedFinanceAccountId =
      typeof financeAccountId === "string" &&
      financeAccountId.length > 0 &&
      financeAccountId.length <= 100
        ? financeAccountId
        : null;
    const hasNotes =
      notes !== null && notes !== undefined && notes !== "";
    const optionalNumbers = [
      [calories, normalizedCalories],
      [proteinGrams, normalizedProtein],
      [carbsGrams, normalizedCarbs],
      [fatGrams, normalizedFat],
      [costCents, normalizedCost],
    ] as const;

    if (
      !normalizedName ||
      !isMealType(type) ||
      (hasNotes && !normalizedNotes) ||
      optionalNumbers.some(
        ([original, normalized]) =>
          original !== null &&
          original !== undefined &&
          original !== "" &&
          normalized === null,
      ) ||
      !normalizedEatenAt
    ) {
      response.status(400).json({
        error: "Revisa la comida, fecha, macros y costo.",
      });
      return;
    }

    const result = await createMeal({
      userId: request.authUser!.id,
      name: normalizedName,
      type,
      notes: normalizedNotes,
      calories: normalizedCalories,
      proteinGrams: normalizedProtein,
      carbsGrams: normalizedCarbs,
      fatGrams: normalizedFat,
      costCents: normalizedCost ?? 0,
      financeAccountId: normalizedFinanceAccountId,
      eatenAt: normalizedEatenAt,
    });

    if (result.error === "account_required") {
      response.status(400).json({
        error: "Selecciona una cuenta de Finanzas para registrar el costo.",
      });
      return;
    }
    if (result.error === "account_not_found") {
      response.status(404).json({
        error: "La cuenta de Finanzas seleccionada no existe.",
      });
      return;
    }

    response.status(201).json({ meal: result.meal });
  }),
);

mealsRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const idParam = request.params.id;
    const id = Array.isArray(idParam) ? undefined : idParam;
    if (!id || id.length > 100) {
      response.status(400).json({ error: "El identificador no es válido." });
      return;
    }

    const deleted = await deleteMeal(request.authUser!.id, id);
    if (!deleted) {
      response.status(404).json({ error: "La comida ya no existe." });
      return;
    }

    response.json({ deleted: true });
  }),
);

