import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";
import {
  createFinanceAccount,
  createFinanceTransaction,
  deleteFinanceTransaction,
  getFinances,
} from "./finances.service.js";
import {
  isAccountType,
  isTransactionKind,
  isValidCents,
  normalizeLabel,
  normalizeOccurredAt,
} from "./finances.validation.js";

export const financesRouter = Router();

financesRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    response.json(await getFinances(_request.authUser!.id));
  }),
);

financesRouter.post(
  "/accounts",
  asyncHandler(async (request, response) => {
    const { name, type, initialBalanceCents } = (request.body ?? {}) as Record<
      string,
      unknown
    >;
    const normalizedName = normalizeLabel(name, 60);

    if (!normalizedName || !isAccountType(type)) {
      response
        .status(400)
        .json({ error: "El nombre o tipo de cuenta no es válido." });
      return;
    }
    if (!isValidCents(initialBalanceCents, { allowNegative: true })) {
      response.status(400).json({ error: "El saldo inicial no es válido." });
      return;
    }

    const account = await createFinanceAccount({
      userId: request.authUser!.id,
      name: normalizedName,
      type,
      initialBalanceCents,
    });
    response.status(201).json({ account });
  }),
);

financesRouter.post(
  "/transactions",
  asyncHandler(async (request, response) => {
    const {
      accountId,
      kind,
      category,
      description,
      amountCents,
      occurredAt,
    } = (request.body ?? {}) as Record<string, unknown>;
    const normalizedAccountId =
      typeof accountId === "string" && accountId.length <= 100
        ? accountId
        : null;
    const normalizedCategory = normalizeLabel(category, 50);
    const normalizedDescription = normalizeLabel(description, 120);
    const normalizedOccurredAt = normalizeOccurredAt(occurredAt);

    if (
      !normalizedAccountId ||
      !isTransactionKind(kind) ||
      !normalizedCategory ||
      !normalizedDescription ||
      !isValidCents(amountCents) ||
      !normalizedOccurredAt
    ) {
      response.status(400).json({ error: "Revisa los datos del movimiento." });
      return;
    }

    const transaction = await createFinanceTransaction({
      userId: request.authUser!.id,
      accountId: normalizedAccountId,
      kind,
      category: normalizedCategory,
      description: normalizedDescription,
      amountCents,
      occurredAt: normalizedOccurredAt,
    });

    if (!transaction) {
      response
        .status(404)
        .json({ error: "La cuenta seleccionada no existe." });
      return;
    }

    response.status(201).json({ transaction });
  }),
);

financesRouter.delete(
  "/transactions/:id",
  asyncHandler(async (request, response) => {
    const idParam = request.params.id;
    const id = Array.isArray(idParam) ? undefined : idParam;
    if (!id || id.length > 100) {
      response.status(400).json({ error: "El identificador no es válido." });
      return;
    }

    const deleted = await deleteFinanceTransaction(
      request.authUser!.id,
      id,
    );
    if (!deleted) {
      response.status(404).json({ error: "El movimiento ya no existe." });
      return;
    }

    response.json({ deleted: true });
  }),
);
